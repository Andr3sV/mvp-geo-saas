/**
 * EDGE FUNCTION: daily-sentiment-analysis
 * 
 * Propósito: Trigger diario que llena la cola de análisis de sentimiento:
 * 1. Encuentra todas las respuestas sin analizar en todos los proyectos
 * 2. Las inserta en sentiment_analysis_queue
 * 3. Invoca múltiples workers process-sentiment-queue en paralelo
 * 
 * Similar a trigger-daily-analysis pero para sentiment analysis
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, errorResponse, successResponse, logInfo, logError } from '../shared/utils.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Supabase configuration missing', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    logInfo('daily-sentiment-analysis', 'Starting daily sentiment analysis trigger');

    // 1. Fetch all unanalyzed AI responses with pagination
    let allUnanalyzedResponses: any[] = [];
    let from = 0;
    const limit = 1000; // Fetch in chunks of 1000
    let hasMore = true;

    while (hasMore) {
      // Get all successful AI responses
      const { data: allResponses, error: responsesError } = await supabase
        .from('ai_responses')
        .select('id, project_id')
        .eq('status', 'success')
        .not('response_text', 'is', null)
        .range(from, from + limit - 1);

      if (responsesError) {
        throw new Error(`Failed to fetch AI responses: ${responsesError.message}`);
      }

      if (!allResponses || allResponses.length === 0) {
        hasMore = false;
        break;
      }

      // Get already analyzed response IDs
      const responseIds = allResponses.map(r => r.id);
      const { data: analyzedResponses } = await supabase
        .from('sentiment_analysis')
        .select('ai_response_id')
        .in('ai_response_id', responseIds);

      const analyzedIds = new Set(
        (analyzedResponses || []).map((r: any) => r.ai_response_id)
      );

      // Filter to only unanalyzed responses
      const unanalyzed = allResponses.filter(r => !analyzedIds.has(r.id));
      allUnanalyzedResponses = [...allUnanalyzedResponses, ...unanalyzed];

      if (allResponses.length < limit) {
        hasMore = false;
      } else {
        from += limit;
      }
    }

    logInfo('daily-sentiment-analysis', `Found ${allUnanalyzedResponses.length} unanalyzed responses`);

    if (allUnanalyzedResponses.length === 0) {
      return successResponse({ 
        message: 'No unanalyzed responses found',
        queued_count: 0
      });
    }

    // 2. Prepare queue items
    const batchId = crypto.randomUUID(); // Unique ID for this daily batch
    const queueItems = allUnanalyzedResponses.map(r => ({
      ai_response_id: r.id,
      project_id: r.project_id,
      status: 'pending',
      batch_id: batchId
    }));

    // 3. Insert into queue (in batches of 100 to be safe)
    const chunkSize = 100;
    let inserted = 0;
    for (let i = 0; i < queueItems.length; i += chunkSize) {
      const chunk = queueItems.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('sentiment_analysis_queue')
        .insert(chunk);
      
      if (insertError) {
        logError('daily-sentiment-analysis', `Failed to insert chunk ${i}`, insertError);
        // Log error but continue with other chunks to maximize processing
      } else {
        inserted += chunk.length;
      }
    }

    logInfo('daily-sentiment-analysis', `Inserted ${inserted} items into queue with batch ${batchId}`);

    // 4. Trigger multiple workers in parallel (FIRE AND FORGET)
    const NUM_WORKERS = 10; // Start with 10 workers for sentiment analysis
    logInfo('daily-sentiment-analysis', `Starting to trigger ${NUM_WORKERS} workers`);

    for (let i = 0; i < NUM_WORKERS; i++) {
      // Invoke without awaiting - true fire and forget
      supabase.functions.invoke('process-sentiment-queue', {
        body: { batch_id: batchId, worker_id: i, auto_invoke_count: 0 }
      }).then(() => {
        logInfo('daily-sentiment-analysis', `Worker ${i} invocation sent successfully`);
      }).catch(err => {
        logError('daily-sentiment-analysis', `Worker ${i} invocation failed`, {
          error: err.message,
          name: err.name
        });
      });
      
      logInfo('daily-sentiment-analysis', `Invoking worker ${i + 1}/${NUM_WORKERS}`);
    }

    // Small delay to ensure invocations are sent
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logInfo('daily-sentiment-analysis', `All ${NUM_WORKERS} workers triggered (processing in background)`);

    return successResponse({ 
      message: `Scheduled ${inserted} responses for sentiment analysis`,
      batch_id: batchId,
      workers_triggered: NUM_WORKERS,
      note: 'Workers will process the queue. Check sentiment_analysis_queue table for status.'
    });

  } catch (error: any) {
    logError('daily-sentiment-analysis', 'Unexpected error', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
