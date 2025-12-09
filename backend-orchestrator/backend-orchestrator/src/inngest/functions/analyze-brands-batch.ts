// =============================================
// BATCH BRAND ANALYSIS WORKFLOW
// =============================================

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';

/**
 * Batch function to analyze brands in AI responses
 * Runs daily at 4:00 AM to process pending analyses
 */
export const analyzeBrandsBatch = inngest.createFunction(
  {
    id: 'analyze-brands-batch',
    name: 'Analyze Brands Batch (4 AM)',
    concurrency: {
      limit: 5, // Process 5 responses concurrently
    },
    retries: 3,
  },
  { cron: '0 4 * * *' }, // Runs at 4:00 AM daily (after AI responses are generated)
  async ({ step }) => {
    const supabase = createSupabaseClient();

    logInfo('analyze-brands-batch', 'Starting batch brand analysis');

    // 1. Fetch AI responses that need brand analysis
    // Only process successful responses that haven't been analyzed yet
    // Note: We don't select response_text here to avoid output_too_large errors in Inngest
    const pendingResponses = await step.run('fetch-pending-responses', async () => {
      let allResponses: { id: string; project_id: string }[] = [];
      let from = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        // Get responses that are successful and don't have brand analysis yet
        // We check if brand_mentions exists for this ai_response_id
        // Only select id and project_id to avoid exceeding Inngest output size limits
        const { data, error } = await supabase
          .from('ai_responses')
          .select('id, project_id')
          .eq('status', 'success')
          .or('brand_analysis_status.is.null,brand_analysis_status.eq.pending,brand_analysis_status.eq.error')
          .not('response_text', 'is', null)
          .range(from, from + limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          logError('analyze-brands-batch', 'Failed to fetch pending responses', error);
          throw new Error(`Failed to fetch responses: ${error.message}`);
        }

        if (data && data.length > 0) {
          // Filter out responses that already have brand analysis
          const { data: analyzedIds } = await supabase
            .from('brand_mentions')
            .select('ai_response_id')
            .in(
              'ai_response_id',
              data.map((r) => r.id)
            );

          const analyzedSet = new Set(
            analyzedIds?.map((a) => a.ai_response_id) || []
          );

          const unanalyzed = data.filter((r) => !analyzedSet.has(r.id));
          allResponses = [...allResponses, ...unanalyzed];

          if (data.length < limit) {
            hasMore = false;
          } else {
            from += limit;
          }
        } else {
          hasMore = false;
        }
      }

      logInfo('analyze-brands-batch', `Found ${allResponses.length} pending responses for brand analysis`);
      return allResponses;
    });

    if (pendingResponses.length === 0) {
      logInfo('analyze-brands-batch', 'No pending responses found');
      return { message: 'No pending responses found for brand analysis' };
    }

    // 2. Send events to analyze each response individually
    const events = pendingResponses.map((response) => ({
      name: 'brand/analyze-response',
      data: {
        ai_response_id: response.id,
        project_id: response.project_id,
      },
    }));

    // Send events in batches
    const BATCH_SIZE = 50; // Smaller batches for brand analysis (more complex processing)
    let eventsSent = 0;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const chunk = events.slice(i, i + BATCH_SIZE);
      await step.sendEvent('trigger-brand-analysis', chunk);
      eventsSent += chunk.length;
    }

    logInfo('analyze-brands-batch', `Scheduled ${eventsSent} responses for brand analysis`);

    return {
      message: `Scheduled ${eventsSent} responses for brand analysis`,
      totalResponses: pendingResponses.length,
    };
  }
);

