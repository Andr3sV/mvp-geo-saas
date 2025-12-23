// =============================================
// DAILY STATS AGGREGATION WORKFLOW
// =============================================

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';

interface DimensionCombination {
  platform: string;
  region: string;
  topic_id: string | null;
}

interface EntityToProcess {
  projectId: string;
  projectName: string;
  entityType: 'brand' | 'competitor';
  competitorId?: string;
  competitorName?: string;
}

interface ProcessingUnit {
  entity: EntityToProcess;
  dimension: DimensionCombination;
}

/**
 * Daily aggregation function for brand statistics
 * Runs at 4:30 AM every day to aggregate today's stats
 * OPTIMIZED: Processes each entity (brand + each competitor) for each dimension combination
 */
export const aggregateDailyStats = inngest.createFunction(
  {
    id: 'aggregate-daily-stats',
    name: 'Aggregate Daily Stats',
    concurrency: {
      limit: 1,
    },
    retries: 3,
  },
  { cron: '30 4 * * *' },
  async ({ step }) => {
    const supabase = createSupabaseClient();

    // Calculate today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const statDate = today.toISOString().split('T')[0];

    logInfo('aggregate-daily-stats', `Starting daily stats aggregation for ${statDate}`);

    // Step 1: Get all processing units (entity + dimension combinations)
    const processingUnits = await step.run('get-processing-units', async () => {
      // Get projects with AI responses from today
      const { data: projectsWithData, error: projectsError } = await supabase
        .from('ai_responses')
        .select('project_id, projects!inner(id, name, brand_name)')
        .gte('created_at', `${statDate}T00:00:00`)
        .lt('created_at', `${statDate}T23:59:59`)
        .eq('status', 'success');

      if (projectsError) {
        throw new Error(`Failed to fetch projects: ${projectsError.message}`);
      }

      // Get unique projects
      const uniqueProjects = new Map<string, { id: string; name: string; brand_name: string }>();
      projectsWithData?.forEach((row: any) => {
        if (row.projects && !uniqueProjects.has(row.project_id)) {
          uniqueProjects.set(row.project_id, {
            id: row.projects.id,
            name: row.projects.name,
            brand_name: row.projects.brand_name || row.projects.name,
          });
        }
      });

      // Build list of all processing units
      const units: ProcessingUnit[] = [];

      for (const [projectId, project] of uniqueProjects) {
        // Get dimension combinations for this project
        const { data: dimensions, error: dimError } = await supabase.rpc(
          'get_dimension_combinations',
          {
            p_project_id: projectId,
            p_stat_date: statDate,
          }
        );

        if (dimError) {
          logError('aggregate-daily-stats', `Failed to get dimensions for ${project.name}`, dimError);
          continue;
        }

        if (!dimensions || dimensions.length === 0) {
          logInfo('aggregate-daily-stats', `No dimensions found for ${project.name}, skipping`);
          continue;
        }

        // Get active competitors for this project
        const { data: competitors } = await supabase
          .from('competitors')
          .select('id, name')
          .eq('project_id', projectId)
          .eq('is_active', true);

        // For each dimension combination
        for (const dim of dimensions) {
          // Add brand entity
          units.push({
            entity: {
              projectId,
              projectName: project.name,
              entityType: 'brand',
            },
            dimension: {
              platform: dim.platform,
              region: dim.region,
              topic_id: dim.topic_id,
            },
          });

          // Add each competitor as separate entity
          competitors?.forEach((comp: any) => {
            units.push({
              entity: {
                projectId,
                projectName: project.name,
                entityType: 'competitor',
                competitorId: comp.id,
                competitorName: comp.name,
              },
              dimension: {
                platform: dim.platform,
                region: dim.region,
                topic_id: dim.topic_id,
              },
            });
          });
        }
      }

      logInfo('aggregate-daily-stats', `Found ${units.length} processing units across ${uniqueProjects.size} projects`);
      return units;
    });

    if (processingUnits.length === 0) {
      logInfo('aggregate-daily-stats', 'No processing units found');
      return { message: 'No data for today', unitsProcessed: 0 };
    }

    // Step 2: Process units in batches (10 per step for efficiency)
    const BATCH_SIZE = 10;
    const batches: ProcessingUnit[][] = [];
    for (let i = 0; i < processingUnits.length; i += BATCH_SIZE) {
      batches.push(processingUnits.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let failCount = 0;
    const failedUnits: string[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchResult = await step.run(`process-batch-${batchIndex}`, async () => {
        let batchSuccess = 0;
        let batchFail = 0;
        const batchFailed: string[] = [];

        for (const unit of batch) {
          try {
            const { entity, dimension } = unit;
            const unitName = entity.entityType === 'brand'
              ? `${entity.projectName}/brand/${dimension.platform}/${dimension.region}`
              : `${entity.projectName}/${entity.competitorName}/${dimension.platform}/${dimension.region}`;

            if (entity.entityType === 'brand') {
              // Aggregate brand stats with dimensions
              const { error } = await supabase.rpc('aggregate_brand_stats_only', {
                p_project_id: entity.projectId,
                p_stat_date: statDate,
                p_platform: dimension.platform,
                p_region: dimension.region,
                p_topic_id: dimension.topic_id,
              });

              if (error) {
                throw new Error(error.message);
              }
              batchSuccess++;
            } else {
              // Aggregate competitor stats with dimensions
              const { error } = await supabase.rpc('aggregate_competitor_stats_only', {
                p_project_id: entity.projectId,
                p_competitor_id: entity.competitorId,
                p_stat_date: statDate,
                p_platform: dimension.platform,
                p_region: dimension.region,
                p_topic_id: dimension.topic_id,
              });

              if (error) {
                throw new Error(error.message);
              }
              batchSuccess++;
            }
          } catch (err: any) {
            batchFail++;
            const unitName = unit.entity.entityType === 'brand'
              ? `${unit.entity.projectName}/brand/${unit.dimension.platform}/${unit.dimension.region}`
              : `${unit.entity.projectName}/${unit.entity.competitorName}/${unit.dimension.platform}/${unit.dimension.region}`;
            batchFailed.push(unitName);
            logError('aggregate-daily-stats', `Failed: ${unitName}`, err);
          }
        }

        return { batchSuccess, batchFail, batchFailed };
      });

      successCount += batchResult.batchSuccess;
      failCount += batchResult.batchFail;
      failedUnits.push(...batchResult.batchFailed);
    }

    // Final summary
    logInfo('aggregate-daily-stats', 'Daily aggregation complete', {
      date: statDate,
      unitsProcessed: successCount,
      unitsFailed: failCount,
      totalUnits: processingUnits.length,
    });

    if (failCount > 0) {
      logError('aggregate-daily-stats', `${failCount} units failed`, { failedUnits });
    }

    return {
      message: `Daily stats aggregation completed for ${statDate}`,
      unitsProcessed: successCount,
      unitsFailed: failCount,
      failedUnits: failCount > 0 ? failedUnits : undefined,
    };
  }
);

/**
 * Manual trigger function for backfilling stats with dimensions
 */
export const backfillProjectStats = inngest.createFunction(
  {
    id: 'backfill-project-stats',
    name: 'Backfill Project Stats',
    concurrency: { limit: 2 },
    retries: 2,
  },
  { event: 'stats/backfill-project' },
  async ({ event, step }) => {
    const { project_id, start_date, end_date } = event.data;
    const supabase = createSupabaseClient();

    logInfo('backfill-project-stats', `Starting backfill for project ${project_id}`, {
      start_date,
      end_date,
    });

    const result = await step.run('run-backfill', async () => {
      const { data, error } = await supabase.rpc('backfill_daily_brand_stats_with_dimensions', {
        p_project_id: project_id,
        p_start_date: start_date,
        p_end_date: end_date || new Date(Date.now() - 86400000).toISOString().split('T')[0],
      });

      if (error) {
        logError('backfill-project-stats', 'Backfill failed', error);
        throw new Error(`Backfill failed: ${error.message}`);
      }

      return { rowsCreated: data };
    });

    logInfo('backfill-project-stats', `Backfill complete for project ${project_id}`, result);

    return {
      message: `Backfill completed for project ${project_id}`,
      project_id,
      start_date,
      end_date,
      rowsCreated: result.rowsCreated,
    };
  }
);
