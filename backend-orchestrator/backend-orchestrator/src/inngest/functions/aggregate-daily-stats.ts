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

/**
 * Daily aggregation function for brand statistics
 * Runs at 4:30 AM every day to aggregate today's stats
 * Uses fan-out pattern: identifies projects and dispatches events for worker functions
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

    // Calculate today's date in UTC
    const now = new Date();
    const statDate = now.toISOString().split('T')[0];

    logInfo('aggregate-daily-stats', `Starting daily stats aggregation for ${statDate}`);

    // Step 1: Get unique projects with data today
    const projects = await step.run('get-projects-with-data', async () => {
      const { data, error } = await supabase
        .from('ai_responses')
        .select('project_id, projects!inner(id, name)')
        .gte('created_at', `${statDate}T00:00:00`)
        .lt('created_at', `${statDate}T23:59:59`)
        .eq('status', 'success');

      if (error) {
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      // Deduplicate projects
      const unique = new Map<string, { id: string; name: string }>();
      data?.forEach((row: any) => {
        if (row.projects && !unique.has(row.project_id)) {
          unique.set(row.project_id, {
            id: row.projects.id,
            name: row.projects.name,
          });
        }
      });

      return Array.from(unique.entries());
    });

    if (projects.length === 0) {
      logInfo('aggregate-daily-stats', 'No projects with data found');
      return { message: 'No projects with data today', projectsDispatched: 0 };
    }

    // Step 2: Dispatch event for each project (fan-out) - IN BATCHES
    const BATCH_SIZE = 1000;
    let eventsSent = 0;

    for (let i = 0; i < projects.length; i += BATCH_SIZE) {
      const chunk = projects.slice(i, i + BATCH_SIZE);
      await step.sendEvent(`dispatch-project-aggregations-${i}`, 
        chunk.map(([projectId, project]) => ({
          name: 'stats/aggregate-project',
          data: {
            project_id: projectId,
            project_name: project.name,
            stat_date: statDate,
          },
        }))
      );
      eventsSent += chunk.length;
    }

    logInfo('aggregate-daily-stats', `Dispatched ${eventsSent} aggregation events in batches`, {
      statDate,
      projectsDispatched: eventsSent,
      batches: Math.ceil(projects.length / BATCH_SIZE),
    });

    return {
      message: `Dispatched aggregation for ${eventsSent} projects`,
      projectsDispatched: eventsSent,
      statDate,
      batches: Math.ceil(projects.length / BATCH_SIZE),
    };
  }
);

/**
 * Worker function to aggregate stats for a single project
 * Processes brand and competitor stats with dimension combinations
 */
export const aggregateProjectStats = inngest.createFunction(
  {
    id: 'aggregate-project-stats',
    name: 'Aggregate Project Stats',
    concurrency: { limit: 5 }, // Process up to 5 projects in parallel
    retries: 3,
  },
  { event: 'stats/aggregate-project' },
  async ({ event, step }) => {
    const { project_id, project_name, stat_date } = event.data;
    const supabase = createSupabaseClient();

    logInfo('aggregate-project-stats', `Starting aggregation for project ${project_name}`, {
      project_id,
      stat_date,
    });

    // Step 1: Get dimensions and competitors for this project
    const { dimensions, competitors } = await step.run('get-project-data', async () => {
      const [dimResult, compResult] = await Promise.all([
        supabase.rpc('get_dimension_combinations', {
          p_project_id: project_id,
          p_stat_date: stat_date,
        }),
        supabase
          .from('competitors')
          .select('id, name')
          .eq('project_id', project_id)
          .eq('is_active', true)
          .limit(50), // LÍMITE: solo los primeros 50 competidores
      ]);

      if (dimResult.error) {
        logError('aggregate-project-stats', `Failed to get dimensions for ${project_name}`, dimResult.error);
        throw new Error(`Failed to get dimensions: ${dimResult.error.message}`);
      }

      if (compResult.error) {
        logError('aggregate-project-stats', `Failed to get competitors for ${project_name}`, compResult.error);
        throw new Error(`Failed to get competitors: ${compResult.error.message}`);
      }

      return {
        dimensions: dimResult.data || [],
        competitors: compResult.data || [],
      };
    });

    if (dimensions.length === 0) {
      logInfo('aggregate-project-stats', `No dimensions found for ${project_name}, skipping`);
      return { message: 'No dimensions found', project_id, project_name };
    }

    logInfo('aggregate-project-stats', `Processing ${dimensions.length} dimensions and ${competitors.length} competitors`, {
      project_id,
      project_name,
    });

    // Step 2: Process brand stats (all dimensions in batches)
    const brandResult = await step.run('aggregate-brand', async () => {
      let success = 0;
      let fail = 0;
      const failed: string[] = [];

      for (const dim of dimensions) {
        try {
          const { error } = await supabase.rpc('aggregate_brand_stats_only', {
            p_project_id: project_id,
            p_stat_date: stat_date,
            p_platform: dim.platform,
            p_region: dim.region,
            p_topic_id: dim.topic_id,
          });

          if (error) {
            throw new Error(error.message);
          }
          success++;
        } catch (err: any) {
          fail++;
          const dimName = `${dim.platform}/${dim.region}/${dim.topic_id || 'null'}`;
          failed.push(dimName);
          logError('aggregate-project-stats', `Failed to aggregate brand stats for dimension: ${dimName}`, err);
        }
      }

      return { success, fail, failed };
    });

    // Step 3: Process competitor stats in batches
    const BATCH_SIZE = 10;
    let compSuccess = 0;
    let compFail = 0;
    const compFailed: string[] = [];

    for (let i = 0; i < competitors.length; i += BATCH_SIZE) {
      const batch = competitors.slice(i, i + BATCH_SIZE);
      const batchResult = await step.run(`aggregate-competitors-${i}`, async () => {
        let s = 0;
        let f = 0;
        const failedDims: string[] = [];

        for (const comp of batch) {
          for (const dim of dimensions) {
            try {
              const { error } = await supabase.rpc('aggregate_competitor_stats_only', {
                p_project_id: project_id,
                p_competitor_id: comp.id,
                p_stat_date: stat_date,
                p_platform: dim.platform,
                p_region: dim.region,
                p_topic_id: dim.topic_id,
              });

              if (error) {
                throw new Error(error.message);
              }
              s++;
            } catch (err: any) {
              f++;
              const dimName = `${comp.name}/${dim.platform}/${dim.region}/${dim.topic_id || 'null'}`;
              failedDims.push(dimName);
              logError('aggregate-project-stats', `Failed to aggregate competitor stats: ${dimName}`, err);
            }
          }
        }

        return { s, f, failedDims };
      });

      compSuccess += batchResult.s;
      compFail += batchResult.f;
      compFailed.push(...batchResult.failedDims);
    }

    logInfo('aggregate-project-stats', `Aggregation complete for ${project_name}`, {
      project_id,
      project_name,
      brandStats: brandResult,
      competitorStats: { success: compSuccess, fail: compFail },
    });

    if (brandResult.fail > 0 || compFail > 0) {
      logError('aggregate-project-stats', `Some aggregations failed for ${project_name}`, {
        brandFailed: brandResult.failed,
        competitorFailed: compFailed,
      });
    }

    return {
      project_id,
      project_name,
      brandStats: brandResult,
      competitorStats: { success: compSuccess, fail: compFail },
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
