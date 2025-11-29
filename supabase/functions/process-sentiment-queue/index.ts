/**
 * EDGE FUNCTION: process-sentiment-queue
 * 
 * Propósito: Worker que procesa la cola de análisis de sentimiento en lotes pequeños:
 * 1. Toma respuestas pendientes de la cola (sentiment_analysis_queue)
 * 2. Para cada respuesta, ejecuta análisis de sentimiento usando Gemini 2.5 Flash Lite
 * 3. Actualiza el estado de cada trabajo (completed/failed)
 * 4. Continúa procesando hasta que no haya más items pendientes
 * 
 * Diseño:
 * - Procesa en lotes de 10 para evitar saturación y timeouts
 * - NO usa recursión - procesa en un loop hasta que la cola esté vacía
 * - Reintenta automáticamente hasta 3 veces en caso de fallo
 * - Auto-invoca si hay más items pendientes (hasta 5 veces)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, errorResponse, successResponse, logInfo, logError } from '../shared/utils.ts';

serve(async (req) => {
  // Log immediately when function is invoked (using both console.log and logInfo)
  const invocationLog = {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  };
  console.log('[process-sentiment-queue] Function invoked', invocationLog);
  logInfo('process-sentiment-queue', 'Function invoked', invocationLog);

  if (req.method === 'OPTIONS') {
    console.log('[process-sentiment-queue] OPTIONS request, returning CORS headers');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    logInfo('process-sentiment-queue', 'Starting function execution');
    console.log('[process-sentiment-queue] Starting function execution');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      logError('process-sentiment-queue', 'Supabase configuration missing');
      return errorResponse('Supabase configuration missing', 500);
    }

    logInfo('process-sentiment-queue', 'Supabase client created');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get auto-invoke count from request body
    let body = {};
    try {
      body = await req.json();
      logInfo('process-sentiment-queue', 'Request body parsed', body);
    } catch (e) {
      logInfo('process-sentiment-queue', 'No request body or parse error (this is OK)', e);
      // Body is optional
    }
    const autoInvokeCount = body.auto_invoke_count || 0;
    const MAX_AUTO_INVOCATIONS = 5;

    const BATCH_SIZE = 10; // Process 10 responses at a time (smaller than prompt analysis because sentiment is more CPU-intensive)
    const MAX_BATCHES_PER_INVOCATION = 10; // Process max 10 batches per invocation = 100 responses
    let totalProcessed = 0;
    let totalFailed = 0;
    let iterations = 0;

    logInfo('process-sentiment-queue', `Starting sentiment queue processing (auto_invoke_count: ${autoInvokeCount})`);

    // First, reset any items stuck in "processing" for more than 10 minutes
    const { count: resetCount } = await supabase
      .from('sentiment_analysis_queue')
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'processing')
      .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // 10 minutes ago
      .select('id', { count: 'exact', head: true });
    
    if (resetCount && resetCount > 0) {
      logInfo('process-sentiment-queue', `Reset ${resetCount} stuck items from processing to pending`);
    }

    // Process a limited number of batches per invocation to avoid timeouts
    while (iterations < MAX_BATCHES_PER_INVOCATION) {
      iterations++;

      // 1. Fetch pending items (including those we just reset)
      // Also retry failed items with less than 3 attempts
      const { data: items, error: fetchError } = await supabase
        .from('sentiment_analysis_queue')
        .select('id, ai_response_id, project_id, attempts, status')
        .or('status.eq.pending,status.eq.failed')
        .lt('attempts', 3) // Retry items that failed less than 3 times
        .order('status', { ascending: true }) // Process pending first, then retry failed
        .order('created_at', { ascending: true }) // FIFO for pending
        .limit(BATCH_SIZE);

      if (fetchError) {
        logError('process-sentiment-queue', 'Failed to fetch queue items', fetchError);
        break;
      }

      if (!items || items.length === 0) {
        logInfo('process-sentiment-queue', `No more pending/retryable items found after ${iterations} batches.`);
        break;
      }

      logInfo('process-sentiment-queue', `Processing batch ${iterations}/${MAX_BATCHES_PER_INVOCATION} (${items.length} items)`);

      // 2. Mark as processing and increment attempts
      for (const item of items) {
        await supabase
          .from('sentiment_analysis_queue')
          .update({ 
            status: 'processing', 
            attempts: (item.attempts || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }

      // 3. Process each item by invoking the 'analyze-sentiment' function
      const processingPromises = items.map(async (item) => {
        try {
          // First, check if this response already has sentiment analysis
          // (to avoid unnecessary API calls)
          const { data: existingAnalysis } = await supabase
            .from('sentiment_analysis')
            .select('id')
            .eq('ai_response_id', item.ai_response_id)
            .eq('project_id', item.project_id)
            .limit(1);

          if (existingAnalysis && existingAnalysis.length > 0) {
            // Already analyzed, mark as completed
            await supabase
              .from('sentiment_analysis_queue')
              .update({ 
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id);

            logInfo('process-sentiment-queue', `✅ Response ${item.ai_response_id} already analyzed, skipping`);
            return { id: item.id, status: 'skipped' };
          }

          // Call analyze-sentiment for this specific response
          const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-sentiment', {
            body: {
              project_id: item.project_id,
              ai_response_id: item.ai_response_id,
              force_reanalysis: false
            }
          });

          if (analysisError) {
            const errorDetails = {
              message: analysisError.message || 'Unknown error',
              context: analysisError.context || null,
              status: analysisError.status || null,
              name: analysisError.name || null
            };
            
            logError('process-sentiment-queue', `analyze-sentiment error for response ${item.ai_response_id}`, errorDetails);
            
            let errorMessage = `analyze-sentiment failed: ${errorDetails.message}`;
            if (errorDetails.status) {
              errorMessage += ` (status: ${errorDetails.status})`;
            }
            
            throw new Error(errorMessage);
          }

          // Check if analysis actually processed anything
          // analyze-sentiment returns processed_count: 0 if no responses to analyze
          const processedCount = analysisResult?.processed_count || 0;
          const alreadyAnalyzed = analysisResult?.already_analyzed || false;
          
          // If already analyzed, mark as completed (this is OK)
          if (alreadyAnalyzed) {
            await supabase
              .from('sentiment_analysis_queue')
              .update({ 
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id);

            logInfo('process-sentiment-queue', `✅ Response ${item.ai_response_id} already analyzed, marking as completed`);
            return { id: item.id, status: 'skipped' };
          }
          
          if (processedCount === 0) {
            // No responses were processed (likely no results from Gemini)
            // Verify if sentiment_analysis was created
            const { data: newAnalysis } = await supabase
              .from('sentiment_analysis')
              .select('id')
              .eq('ai_response_id', item.ai_response_id)
              .eq('project_id', item.project_id)
              .limit(1);

            if (newAnalysis && newAnalysis.length > 0) {
              // Analysis was created, mark as completed
              await supabase
                .from('sentiment_analysis_queue')
                .update({ 
                  status: 'completed',
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.id);

              logInfo('process-sentiment-queue', `✅ Completed sentiment analysis for response ${item.ai_response_id} (analysis created)`);
              totalProcessed++;
              return { id: item.id, status: 'success' };
            } else {
              // No analysis was created - this might be because Gemini didn't find entities
              // Mark as completed anyway to avoid infinite retries (this is expected for some responses)
              await supabase
                .from('sentiment_analysis_queue')
                .update({ 
                  status: 'completed',
                  updated_at: new Date().toISOString(),
                  error_message: 'No sentiment analysis created (possibly no entities found in response - this is OK)'
                })
                .eq('id', item.id);

              // This is NOT an error - it's a valid case where the response doesn't mention the brand/competitors
              logInfo('process-sentiment-queue', `✅ Response ${item.ai_response_id} completed (no entities found - this is normal, not an error)`);
              totalProcessed++; // Count as processed since it was successfully analyzed
              return { id: item.id, status: 'completed_no_results' };
            }
          }

          // Analysis processed successfully
          await supabase
            .from('sentiment_analysis_queue')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          totalProcessed++;
          logInfo('process-sentiment-queue', `✅ Completed sentiment analysis for response ${item.ai_response_id}`);
          return { id: item.id, status: 'success' };

        } catch (err: any) {
          const currentAttempts = (item.attempts || 0) + 1;
          const maxAttempts = 3;
          
          // Check if it's a rate limit error (429) - these should be retried with longer delays
          const isRateLimit = err.message?.includes('429') || err.message?.includes('rate limit') || err.message?.includes('Rate limited');
          
          if (isRateLimit) {
            logError('process-sentiment-queue', `⚠️ Rate limit error for item ${item.id} (attempt ${currentAttempts}/${maxAttempts})`, err);
            
            if (currentAttempts < maxAttempts) {
              // Mark as pending for retry (with longer delay)
              await supabase
                .from('sentiment_analysis_queue')
                .update({ 
                  status: 'pending', // Reset to pending so it can be retried later
                  error_message: `[Rate limit - Attempt ${currentAttempts}/${maxAttempts}] ${err.message || 'Rate limited'}`,
                  attempts: currentAttempts,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.id);
              
              logInfo('process-sentiment-queue', `🔄 Item ${item.id} will be retried later due to rate limit (attempt ${currentAttempts}/${maxAttempts})`);
              return { id: item.id, status: 'retry_rate_limit', error: err.message, attempts: currentAttempts };
            } else {
              // Max attempts reached for rate limit - mark as failed
              await supabase
                .from('sentiment_analysis_queue')
                .update({ 
                  status: 'failed',
                  error_message: `[Rate limit - Max attempts reached] ${err.message || 'Rate limited after 3 attempts'}`,
                  attempts: currentAttempts,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.id);
              
              logError('process-sentiment-queue', `❌ Item ${item.id} permanently failed after ${maxAttempts} rate limit attempts`);
              totalFailed++;
              return { id: item.id, status: 'failed', error: err.message, attempts: currentAttempts };
            }
          } else {
            // Other errors
            logError('process-sentiment-queue', `❌ Error processing item ${item.id} (attempt ${currentAttempts}/${maxAttempts})`, err);
            
            await supabase
              .from('sentiment_analysis_queue')
              .update({ 
                status: currentAttempts >= maxAttempts ? 'failed' : 'pending',
                error_message: `[Attempt ${currentAttempts}/${maxAttempts}] ${err.message || 'Unknown error'}`,
                attempts: currentAttempts,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id);
            
            if (currentAttempts >= maxAttempts) {
              logError('process-sentiment-queue', `❌ Item ${item.id} permanently failed after ${maxAttempts} attempts`);
              totalFailed++;
            } else {
              logInfo('process-sentiment-queue', `🔄 Item ${item.id} will be retried (attempt ${currentAttempts}/${maxAttempts})`);
            }
            
            return { id: item.id, status: currentAttempts >= maxAttempts ? 'failed' : 'retry', error: err.message, attempts: currentAttempts };
          }
        }
      });

      await Promise.allSettled(processingPromises);

      // Small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
    }

    logInfo('process-sentiment-queue', `Finished current invocation. Processed: ${totalProcessed}, Failed: ${totalFailed}`);

    // Check if more items exist in the queue for auto-invocation
    const { count: remainingCount } = await supabase
      .from('sentiment_analysis_queue')
      .select('id', { count: 'exact', head: true })
      .or('status.eq.pending,status.eq.failed')
      .lt('attempts', 3);

    if (remainingCount && remainingCount > 0 && autoInvokeCount < MAX_AUTO_INVOCATIONS) {
      logInfo('process-sentiment-queue', `${remainingCount} items remaining. Auto-invoking next worker (count: ${autoInvokeCount + 1}).`);
      
      // Auto-invoke itself (fire and forget)
      supabase.functions.invoke('process-sentiment-queue', {
        body: { auto_invoke_count: autoInvokeCount + 1 }
      }).then(() => {
        logInfo('process-sentiment-queue', `Auto-invocation ${autoInvokeCount + 1} sent successfully.`);
      }).catch(err => {
        logError('process-sentiment-queue', `Failed to auto-invoke next worker (count: ${autoInvokeCount + 1})`, err);
      });
    } else if (remainingCount && remainingCount > 0) {
      logInfo('process-sentiment-queue', `Max auto-invocations reached (${MAX_AUTO_INVOCATIONS}). ${remainingCount} items still pending/failed.`);
    } else {
      logInfo('process-sentiment-queue', 'Queue processing finished. No more pending/retryable items.');
    }

    return successResponse({ 
      message: 'Sentiment queue batch processed', 
      processed: totalProcessed, 
      failed: totalFailed,
      remaining_in_queue: remainingCount || 0,
      auto_invoke_count: autoInvokeCount
    });

  } catch (error: any) {
    logError('process-sentiment-queue', `Unexpected error in process-sentiment-queue: ${error.message}`, error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

