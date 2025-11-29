/**
 * EDGE FUNCTION: trigger-sentiment-analysis
 * 
 * Propósito: Trigger manual para análisis de sentimiento (desde el frontend):
 * 1. Encuentra respuestas sin analizar para un proyecto específico
 * 2. Las inserta en sentiment_analysis_queue
 * 3. Invoca múltiples workers process-sentiment-queue en paralelo
 * 
 * Similar a daily-sentiment-analysis pero para un proyecto específico
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, errorResponse, successResponse, logInfo, logError } from '../shared/utils.ts';

serve(async (req) => {
  // Log immediately when function is invoked
  console.log('[trigger-sentiment-analysis] Function invoked', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    logInfo('trigger-sentiment-analysis', 'Starting function execution');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      logError('trigger-sentiment-analysis', 'Supabase configuration missing');
      return errorResponse('Supabase configuration missing', 500);
    }

    logInfo('trigger-sentiment-analysis', 'Supabase client created');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let body: any = {};
    try {
      body = await req.json();
      logInfo('trigger-sentiment-analysis', 'Request body parsed', body);
    } catch (e) {
      logError('trigger-sentiment-analysis', 'Failed to parse request body', e);
      return errorResponse('Invalid request body', 400);
    }

    const { project_id, ai_response_id, force_reanalysis = false } = body;

    if (!project_id) {
      logError('trigger-sentiment-analysis', 'project_id is required');
      return errorResponse('project_id is required', 400);
    }

    logInfo('trigger-sentiment-analysis', `Starting sentiment analysis trigger for project ${project_id}`, {
      ai_response_id,
      force_reanalysis
    });

    // If specific response ID provided, analyze only that one
    if (ai_response_id) {
      // Check if already analyzed (unless force_reanalysis)
      if (!force_reanalysis) {
        const { data: existing } = await supabase
          .from('sentiment_analysis')
          .select('id')
          .eq('ai_response_id', ai_response_id)
          .eq('project_id', project_id)
          .limit(1);

        if (existing && existing.length > 0) {
          return successResponse({
            message: 'Response already analyzed',
            queued_count: 0
          });
        }
      }

      // Insert single item into queue
      const batchId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from('sentiment_analysis_queue')
        .insert({
          ai_response_id,
          project_id,
          status: 'pending',
          batch_id: batchId
        });

      if (insertError) {
        return errorResponse(`Failed to queue response: ${insertError.message}`, 500);
      }

      // Trigger a single worker
      supabase.functions.invoke('process-sentiment-queue', {
        body: { batch_id: batchId, worker_id: 0, auto_invoke_count: 0 }
      }).catch(err => {
        logError('trigger-sentiment-analysis', 'Failed to invoke worker', err);
      });

      return successResponse({
        message: 'Response queued for sentiment analysis',
        queued_count: 1,
        batch_id: batchId
      });
    }

    // Otherwise, find all unanalyzed responses for the project
    let allUnanalyzedResponses: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      // Get all successful AI responses for this project
      const { data: allResponses, error: responsesError } = await supabase
        .from('ai_responses')
        .select('id, project_id')
        .eq('project_id', project_id)
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
        .eq('project_id', project_id)
        .in('ai_response_id', responseIds);

      const analyzedIds = new Set(
        (analyzedResponses || []).map((r: any) => r.ai_response_id)
      );

      // Filter to only unanalyzed responses (or all if force_reanalysis)
      const unanalyzed = force_reanalysis 
        ? allResponses 
        : allResponses.filter(r => !analyzedIds.has(r.id));
      
      allUnanalyzedResponses = [...allUnanalyzedResponses, ...unanalyzed];

      if (allResponses.length < limit) {
        hasMore = false;
      } else {
        from += limit;
      }
    }

    logInfo('trigger-sentiment-analysis', `Found ${allUnanalyzedResponses.length} responses to analyze`);

    if (allUnanalyzedResponses.length === 0) {
      return successResponse({
        message: 'No responses to analyze',
        queued_count: 0
      });
    }

    // Prepare queue items
    const batchId = crypto.randomUUID();
    const queueItems = allUnanalyzedResponses.map(r => ({
      ai_response_id: r.id,
      project_id: r.project_id,
      status: 'pending',
      batch_id: batchId
    }));

    // Insert into queue (in batches of 100)
    const chunkSize = 100;
    let inserted = 0;
    for (let i = 0; i < queueItems.length; i += chunkSize) {
      const chunk = queueItems.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('sentiment_analysis_queue')
        .insert(chunk);
      
      if (insertError) {
        logError('trigger-sentiment-analysis', `Failed to insert chunk ${i}`, insertError);
      } else {
        inserted += chunk.length;
      }
    }

    logInfo('trigger-sentiment-analysis', `Inserted ${inserted} items into queue with batch ${batchId}`);

    // Trigger multiple workers in parallel
    const NUM_WORKERS = Math.min(10, Math.ceil(inserted / 10)); // Scale workers based on queue size
    logInfo('trigger-sentiment-analysis', `Starting to trigger ${NUM_WORKERS} workers for batch ${batchId}`);

    const workerPromises = [];
    for (let i = 0; i < NUM_WORKERS; i++) {
      logInfo('trigger-sentiment-analysis', `Initiating worker ${i + 1}/${NUM_WORKERS} invocation`);
      
      const invokePromise = supabase.functions.invoke('process-sentiment-queue', {
        body: { batch_id: batchId, worker_id: i, auto_invoke_count: 0 }
      }).then((result) => {
        logInfo('trigger-sentiment-analysis', `Worker ${i} invocation completed`, {
          hasData: !!result.data,
          hasError: !!result.error,
          error: result.error ? result.error.message : null
        });
        return { workerId: i, success: true, result };
      }).catch((err) => {
        logError('trigger-sentiment-analysis', `Worker ${i} invocation failed`, {
          error: err.message,
          name: err.name,
          stack: err.stack
        });
        return { workerId: i, success: false, error: err };
      });
      
      workerPromises.push(invokePromise);
    }

    // Wait a bit for invocations to be sent
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check results (but don't wait for all to complete)
    const results = await Promise.allSettled(workerPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    logInfo('trigger-sentiment-analysis', `Workers invocation summary: ${successful} successful, ${failed} failed out of ${NUM_WORKERS} total`);
    logInfo('trigger-sentiment-analysis', `All ${NUM_WORKERS} workers triggered (processing in background)`);

    return successResponse({
      message: `Scheduled ${inserted} responses for sentiment analysis`,
      processed_count: inserted,
      batch_id: batchId,
      workers_triggered: NUM_WORKERS
    });

  } catch (error: any) {
    logError('trigger-sentiment-analysis', 'Unexpected error', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

