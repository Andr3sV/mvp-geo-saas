// =============================================
// DAILY STATS AGGREGATION WORKFLOW
// =============================================

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';

/**
 * Daily aggregation function for brand statistics
 * Runs at 2:00 AM every day to aggregate yesterday's stats
 * Uses the aggregate_daily_stats_for_all_projects SQL function
 */
export const aggregateDailyStats = inngest.createFunction(
  {
    id: 'aggregate-daily-stats',
    name: 'Aggregate Daily Stats',
    concurrency: {
      limit: 1, // Only one aggregation at a time
    },
    retries: 3,
  },
  { cron: '0 2 * * *' }, // Runs daily at 2:00 AM
  async ({ step }) => {
    const supabase = createSupabaseClient();

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const statDate = yesterday.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    logInfo('aggregate-daily-stats', `Starting daily stats aggregation for ${statDate}`);

    // 1. Run the aggregation function
    const aggregationResult = await step.run('run-aggregation', async () => {
      // Call the SQL function to aggregate stats for all projects
      const { data, error } = await supabase.rpc('aggregate_daily_stats_for_all_projects', {
        p_stat_date: statDate,
      });

      if (error) {
        logError('aggregate-daily-stats', 'Aggregation failed', error);
        throw new Error(`Aggregation failed: ${error.message}`);
      }

      logInfo('aggregate-daily-stats', `Aggregation completed`, { results: data });

      // Calculate totals
      const totalProjects = data?.length || 0;
      const totalRows = data?.reduce((sum: number, row: { rows_affected: number }) => sum + row.rows_affected, 0) || 0;

      return {
        date: statDate,
        projectsProcessed: totalProjects,
        rowsCreated: totalRows,
        details: data,
      };
    });

    // 2. Log summary
    logInfo('aggregate-daily-stats', 'Daily aggregation complete', {
      date: statDate,
      projectsProcessed: aggregationResult.projectsProcessed,
      rowsCreated: aggregationResult.rowsCreated,
    });

    return {
      message: `Daily stats aggregation completed for ${statDate}`,
      projectsProcessed: aggregationResult.projectsProcessed,
      rowsCreated: aggregationResult.rowsCreated,
    };
  }
);

/**
 * Manual trigger function for backfilling stats
 * Can be invoked manually to backfill stats for a specific project
 */
export const backfillProjectStats = inngest.createFunction(
  {
    id: 'backfill-project-stats',
    name: 'Backfill Project Stats',
    concurrency: {
      limit: 2, // Allow 2 backfills at a time
    },
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

    // Run the backfill function
    const result = await step.run('run-backfill', async () => {
      const { data, error } = await supabase.rpc('backfill_daily_brand_stats', {
        p_project_id: project_id,
        p_start_date: start_date,
        p_end_date: end_date || new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
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

