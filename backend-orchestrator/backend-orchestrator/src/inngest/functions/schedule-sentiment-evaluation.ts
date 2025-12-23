// =============================================
// SCHEDULE SENTIMENT EVALUATION
// =============================================
// Cron job that lists all needed sentiment evaluations
// and dispatches events for process-single-sentiment-evaluation

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';

export const scheduleSentimentEvaluation = inngest.createFunction(
  {
    id: 'schedule-sentiment-evaluation',
    name: 'Schedule Sentiment Evaluation',
  },
  { cron: '30 3 * * *' }, // 3:30 AM UTC daily
  async ({ step }) => {
    const supabase = createSupabaseClient();

    logInfo('schedule-sentiment-evaluation', 'Starting sentiment evaluation scheduling');

    // 1. Fetch all projects with extracted topics and industry
    const projects = await step.run('fetch-projects', async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, brand_name, industry, extracted_topics')
        .not('industry', 'is', null)
        .not('extracted_topics', 'eq', '[]');

      if (error) {
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      logInfo('schedule-sentiment-evaluation', `Found ${data?.length || 0} projects with topics`);
      return data || [];
    });

    if (projects.length === 0) {
      logInfo('schedule-sentiment-evaluation', 'No projects with extracted topics found');
      return { message: 'No projects to evaluate', events_sent: 0 };
    }

    // 2. Generate all evaluation combinations and check existing ones
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const events = await step.run('generate-evaluation-events', async () => {
      const eventsToSend: Array<{
        name: string;
        data: {
          project_id: string;
          topic: string;
          region_id: string | null;
          entity_type: 'brand' | 'competitor';
          entity_name: string;
          competitor_id: string | null;
        };
      }> = [];

      for (const project of projects) {
        const topics = project.extracted_topics as string[];
        const brandName = project.brand_name || project.name;
        const industry = project.industry;

        if (!topics || topics.length === 0 || !industry) {
          logInfo('schedule-sentiment-evaluation', `Skipping project ${project.id}: no topics or industry`);
          continue;
        }

        // Get active competitors for this project
        const { data: competitors, error: competitorsError } = await supabase
          .from('competitors')
          .select('id, name')
          .eq('project_id', project.id)
          .eq('is_active', true);

        if (competitorsError) {
          logError('schedule-sentiment-evaluation', `Failed to fetch competitors for project ${project.id}`, competitorsError);
        }

        const activeCompetitors = competitors || [];

        // Get distinct region_ids from prompt_tracking for this project
        const { data: regionsData, error: regionsError } = await supabase
          .from('prompt_tracking')
          .select('region_id')
          .eq('project_id', project.id)
          .eq('is_active', true)
          .not('region_id', 'is', null);

        if (regionsError) {
          logError('schedule-sentiment-evaluation', `Failed to fetch regions for project ${project.id}`, regionsError);
        }

        // Extract unique region_ids
        const distinctRegionIds = [...new Set(
          regionsData?.map((r: any) => r.region_id).filter((id): id is string => !!id) || []
        )];

        // If no regions, use null for GLOBAL (virtual sum of all regions)
        const regionsToProcess = distinctRegionIds.length > 0 ? distinctRegionIds : [null];

        // Generate all combinations: (topic, region_id) × (brand + competitors)
        for (const regionId of regionsToProcess) {
          for (const topic of topics) {
            // Check if brand evaluation already exists today
            let existingBrandQuery = supabase
              .from('brand_evaluations')
              .select('id')
              .eq('project_id', project.id)
              .eq('topic', topic)
              .eq('entity_type', 'brand')
              .is('competitor_id', null)
              .gte('created_at', startOfToday.toISOString())
              .lte('created_at', endOfToday.toISOString());

            // Filter by region_id (null means GLOBAL, don't filter)
            if (regionId !== null) {
              existingBrandQuery = existingBrandQuery.eq('region_id', regionId);
            } else {
              existingBrandQuery = existingBrandQuery.is('region_id', null);
            }

            const { data: existingBrandEval } = await existingBrandQuery.limit(1);

            if (!existingBrandEval || existingBrandEval.length === 0) {
              eventsToSend.push({
                name: 'sentiment/evaluate-single',
                data: {
                  project_id: project.id,
                  topic,
                  region_id: regionId,
                  entity_type: 'brand',
                  entity_name: brandName,
                  competitor_id: null,
                },
              });
            }

            // Check each competitor
            for (const competitor of activeCompetitors) {
              let existingCompetitorQuery = supabase
                .from('brand_evaluations')
                .select('id')
                .eq('project_id', project.id)
                .eq('topic', topic)
                .eq('entity_type', 'competitor')
                .eq('competitor_id', competitor.id)
                .gte('created_at', startOfToday.toISOString())
                .lte('created_at', endOfToday.toISOString());

              // Filter by region_id (null means GLOBAL, don't filter)
              if (regionId !== null) {
                existingCompetitorQuery = existingCompetitorQuery.eq('region_id', regionId);
              } else {
                existingCompetitorQuery = existingCompetitorQuery.is('region_id', null);
              }

              const { data: existingCompetitorEval } = await existingCompetitorQuery.limit(1);

              if (!existingCompetitorEval || existingCompetitorEval.length === 0) {
                eventsToSend.push({
                  name: 'sentiment/evaluate-single',
                  data: {
                    project_id: project.id,
                    topic,
                    region_id: regionId,
                    entity_type: 'competitor',
                    entity_name: competitor.name,
                    competitor_id: competitor.id,
                  },
                });
              }
            }
          }
        }
      }

      logInfo('schedule-sentiment-evaluation', `Generated ${eventsToSend.length} evaluation events`);
      return eventsToSend;
    });

    if (events.length === 0) {
      logInfo('schedule-sentiment-evaluation', 'All evaluations already exist for today');
      return { 
        message: 'All evaluations already exist for today',
        events_sent: 0 
      };
    }

    // 3. Send events in batches
    const BATCH_SIZE = 1000;
    let eventsSent = 0;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const chunk = events.slice(i, i + BATCH_SIZE);
      await step.sendEvent('trigger-sentiment-evaluations', chunk);
      eventsSent += chunk.length;
    }

    logInfo('schedule-sentiment-evaluation', `Scheduled ${eventsSent} sentiment evaluation events`);

    return { 
      message: `Scheduled ${eventsSent} sentiment evaluations`,
      events_sent: eventsSent,
      total_projects: projects.length,
    };
  }
);

