// =============================================
// DAILY STATS AGGREGATION WORKFLOW
// =============================================

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';

interface EntityToProcess {
  projectId: string;
  projectName: string;
  entityType: 'brand' | 'competitor';
  competitorId?: string;
  competitorName?: string;
}

/**
 * Daily aggregation function for brand statistics
 * Runs at 1:30 AM every day to aggregate yesterday's stats
 * OPTIMIZED: Processes each entity (brand + each competitor) individually
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
  { cron: '30 1 * * *' },
  async ({ step }) => {
    const supabase = createSupabaseClient();

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const statDate = yesterday.toISOString().split('T')[0];

    logInfo('aggregate-daily-stats', `Starting daily stats aggregation for ${statDate}`);

    // Step 1: Get all entities to process (brands + competitors)
    const entities = await step.run('get-entities-to-process', async () => {
      // Get projects with AI responses from yesterday
      const { data: projectsWithData, error: projectsError } = await supabase
        .from('ai_responses')
        .select('project_id, projects!inner(id, name)')
        .gte('created_at', `${statDate}T00:00:00`)
        .lt('created_at', `${statDate}T23:59:59`);

      if (projectsError) {
        throw new Error(`Failed to fetch projects: ${projectsError.message}`);
      }

      // Get unique projects
      const uniqueProjects = new Map<string, { id: string; name: string }>();
      projectsWithData?.forEach((row: any) => {
        if (row.projects && !uniqueProjects.has(row.project_id)) {
          uniqueProjects.set(row.project_id, {
            id: row.projects.id,
            name: row.projects.name,
          });
        }
      });

      // Build list of all entities to process
      const entitiesToProcess: EntityToProcess[] = [];

      for (const [projectId, project] of uniqueProjects) {
        // Add brand entity
        entitiesToProcess.push({
          projectId,
          projectName: project.name,
          entityType: 'brand',
        });

        // Get active competitors for this project
        const { data: competitors } = await supabase
          .from('competitors')
          .select('id, name')
          .eq('project_id', projectId)
          .eq('is_active', true);

        // Add each competitor as separate entity
        competitors?.forEach((comp: any) => {
          entitiesToProcess.push({
            projectId,
            projectName: project.name,
            entityType: 'competitor',
            competitorId: comp.id,
            competitorName: comp.name,
          });
        });
      }

      logInfo('aggregate-daily-stats', `Found ${entitiesToProcess.length} entities to process across ${uniqueProjects.size} projects`);
      return entitiesToProcess;
    });

    if (entities.length === 0) {
      logInfo('aggregate-daily-stats', 'No entities to process');
      return { message: 'No data for yesterday', entitiesProcessed: 0 };
    }

    // Step 2: Process entities in batches (10 per step for efficiency)
    const BATCH_SIZE = 10;
    const batches: EntityToProcess[][] = [];
    for (let i = 0; i < entities.length; i += BATCH_SIZE) {
      batches.push(entities.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let failCount = 0;
    const failedEntities: string[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchResult = await step.run(`process-batch-${batchIndex}`, async () => {
        let batchSuccess = 0;
        let batchFail = 0;
        const batchFailed: string[] = [];

        for (const entity of batch) {
          try {
            if (entity.entityType === 'brand') {
              // Aggregate brand stats
              const { error } = await supabase.rpc('aggregate_brand_stats_only', {
                p_project_id: entity.projectId,
                p_stat_date: statDate,
              });

              if (error) {
                throw new Error(error.message);
              }
              batchSuccess++;
            } else {
              // Aggregate competitor stats
              const { error } = await supabase.rpc('aggregate_competitor_stats_only', {
                p_project_id: entity.projectId,
                p_competitor_id: entity.competitorId,
                p_stat_date: statDate,
              });

              if (error) {
                throw new Error(error.message);
              }
              batchSuccess++;
            }
          } catch (err: any) {
            batchFail++;
            const entityName = entity.entityType === 'brand' 
              ? `${entity.projectName} (brand)` 
              : `${entity.projectName}/${entity.competitorName}`;
            batchFailed.push(entityName);
            logError('aggregate-daily-stats', `Failed: ${entityName}`, err);
          }
        }

        return { batchSuccess, batchFail, batchFailed };
      });

      successCount += batchResult.batchSuccess;
      failCount += batchResult.batchFail;
      failedEntities.push(...batchResult.batchFailed);
    }

    // Final summary
    logInfo('aggregate-daily-stats', 'Daily aggregation complete', {
      date: statDate,
      entitiesProcessed: successCount,
      entitiesFailed: failCount,
      totalEntities: entities.length,
    });

    if (failCount > 0) {
      logError('aggregate-daily-stats', `${failCount} entities failed`, { failedEntities });
    }

    return {
      message: `Daily stats aggregation completed for ${statDate}`,
      entitiesProcessed: successCount,
      entitiesFailed: failCount,
      failedEntities: failCount > 0 ? failedEntities : undefined,
    };
  }
);

/**
 * Manual trigger function for backfilling stats
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
      const { data, error } = await supabase.rpc('backfill_daily_brand_stats', {
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
