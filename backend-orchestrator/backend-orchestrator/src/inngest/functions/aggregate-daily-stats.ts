// =============================================
// DAILY STATS AGGREGATION WORKFLOW
// =============================================

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';

/**
 * Daily aggregation function for brand statistics
 * Runs at 2:00 AM every day to aggregate yesterday's stats
 * OPTIMIZED: Processes each project individually to avoid timeouts
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

    // Step 1: Get all projects with data for yesterday
    const projects = await step.run('get-active-projects', async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) {
        logError('aggregate-daily-stats', 'Failed to fetch projects', error);
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      logInfo('aggregate-daily-stats', `Found ${data?.length || 0} projects to process`);
      return data || [];
    });

    if (projects.length === 0) {
      logInfo('aggregate-daily-stats', 'No projects found');
      return { message: 'No projects to process', projectsProcessed: 0, rowsCreated: 0 };
    }

    // Step 2: Process each project individually (avoids timeout)
    let totalRows = 0;
    let processedCount = 0;
    const errors: string[] = [];

    // Process in batches of 5 projects per step to balance speed and reliability
    const BATCH_SIZE = 5;
    const batches = [];
    for (let i = 0; i < projects.length; i += BATCH_SIZE) {
      batches.push(projects.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      const batchResult = await step.run(`aggregate-batch-${batchIndex}`, async () => {
        let batchRows = 0;
        let batchProcessed = 0;
        const batchErrors: string[] = [];

        for (const project of batch) {
          try {
            // Call aggregate_daily_brand_stats for this specific project
            const { data, error } = await supabase.rpc('aggregate_daily_brand_stats', {
              p_project_id: project.id,
              p_stat_date: statDate,
            });

            if (error) {
              logError('aggregate-daily-stats', `Failed to aggregate project ${project.name}`, error);
              batchErrors.push(`${project.name}: ${error.message}`);
            } else {
              const rowsAffected = data || 0;
              batchRows += rowsAffected;
              batchProcessed++;
              
              if (rowsAffected > 0) {
                logInfo('aggregate-daily-stats', `Project "${project.name}": ${rowsAffected} rows`);
              }
            }
          } catch (err: any) {
            logError('aggregate-daily-stats', `Exception for project ${project.name}`, err);
            batchErrors.push(`${project.name}: ${err.message}`);
          }
        }

        return { batchRows, batchProcessed, batchErrors };
      });

      totalRows += batchResult.batchRows;
      processedCount += batchResult.batchProcessed;
      errors.push(...batchResult.batchErrors);
    }

    // Log summary
    logInfo('aggregate-daily-stats', 'Daily aggregation complete', {
      date: statDate,
      projectsProcessed: processedCount,
      rowsCreated: totalRows,
      errors: errors.length,
    });

    return {
      message: `Daily stats aggregation completed for ${statDate}`,
      projectsProcessed: processedCount,
      rowsCreated: totalRows,
      errors: errors.length > 0 ? errors : undefined,
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
