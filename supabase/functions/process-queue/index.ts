/**
 * EDGE FUNCTION: process-queue
 * 
 * Propósito: Worker que procesa la cola de análisis en lotes pequeños:
 * 1. Toma 5 prompts pendientes de la cola (analysis_queue)
 * 2. Para cada prompt, ejecuta análisis en TODOS los LLMs:
 *    - Perplexity (Web Search)
 *    - Google Gemini (Web Search)
 *    - OpenAI (GPT-4)
 *    - Anthropic Claude
 * 3. Actualiza el estado de cada trabajo (completed/failed)
 * 4. Continúa procesando hasta que no haya más items pendientes
 * 
 * Diseño mejorado:
 * - Procesa en lotes de 5 para evitar saturación y timeouts
 * - NO usa recursión - procesa en un loop hasta que la cola esté vacía
 * - Reintenta automáticamente hasta 3 veces en caso de fallo
 * - Más robusto y predecible
 * 
 * Documentación completa: CRON_ANALYSIS_AND_IMPROVEMENTS.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, errorResponse, successResponse, logInfo, logError } from '../shared/utils.ts';

serve(async (req) => {
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

    // Get auto-invoke count from request body (to prevent infinite recursion)
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }
    const autoInvokeCount = body.auto_invoke_count || 0;
    const MAX_AUTO_INVOCATIONS = 5; // Allow up to 5 auto-invocations per worker chain

    const BATCH_SIZE = 5;
    const MAX_BATCHES_PER_INVOCATION = 20; // Process max 20 batches per invocation = 100 prompts (increased for efficiency)
    let totalProcessed = 0;
    let totalFailed = 0;
    let iterations = 0;

    logInfo('process-queue', 'Starting queue processing');

    // First, reset any items stuck in "processing" for more than 10 minutes
    // This handles cases where workers crashed or timed out
    const { count: resetCount } = await supabase
      .from('analysis_queue')
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'processing')
      .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // 10 minutes ago
      .select('id', { count: 'exact', head: true });
    
    if (resetCount && resetCount > 0) {
      logInfo('process-queue', `Reset ${resetCount} stuck items from processing to pending`);
    }

    // Process a limited number of batches per invocation to avoid timeouts
    // If more items remain, we'll auto-invoke once more (not infinite recursion)
    while (iterations < MAX_BATCHES_PER_INVOCATION) {
      iterations++;

      // 1. Fetch pending items (including those we just reset)
      // Also retry failed items with less than 3 attempts (automatic retry)
      const { data: items, error: fetchError } = await supabase
        .from('analysis_queue')
        .select('id, prompt_tracking_id, project_id, attempts, status')
        .or('status.eq.pending,status.eq.failed')
        .lt('attempts', 3) // Retry items that failed less than 3 times
        .order('status', { ascending: true }) // Process pending first, then retry failed
        .limit(BATCH_SIZE);

      if (fetchError) {
        logError('process-queue', 'Failed to fetch queue items', fetchError);
        break;
      }

      if (!items || items.length === 0) {
        logInfo('process-queue', 'Queue is empty, finishing');
        break;
      }

      logInfo('process-queue', `Processing batch ${iterations}/${MAX_BATCHES_PER_INVOCATION}: ${items.length} items`);

      // 2. Mark as processing and increment attempts
      for (const item of items) {
        await supabase
          .from('analysis_queue')
          .update({ 
            status: 'processing', 
            attempts: (item.attempts || 0) + 1 
          })
          .eq('id', item.id);
      }

      // 3. Process each item
      const processingPromises = items.map(async (item) => {
        try {
          // Fetch the prompt text
          const { data: promptData, error: promptError } = await supabase
            .from('prompt_tracking')
            .select('prompt')
            .eq('id', item.prompt_tracking_id)
            .single();

          if (promptError || !promptData) {
            throw new Error(`Prompt not found: ${promptError?.message || 'No data'}`);
          }

          // Call analyze-prompt with ALL platforms
          const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-prompt', {
            body: {
              prompt_tracking_id: item.prompt_tracking_id,
              project_id: item.project_id,
              prompt_text: promptData.prompt,
              platforms: ['perplexity', 'gemini', 'openai', 'claude']
            }
          });

          if (analysisError) {
            // Capture more details about the error
            const errorDetails = {
              message: analysisError.message || 'Unknown error',
              context: analysisError.context || null,
              status: analysisError.status || null,
              name: analysisError.name || null
            };
            
            logError('process-queue', `analyze-prompt error for prompt ${item.prompt_tracking_id}`, errorDetails);
            
            // Try to get more info from the error
            let errorMessage = `analyze-prompt failed: ${errorDetails.message}`;
            if (errorDetails.status) {
              errorMessage += ` (status: ${errorDetails.status})`;
            }
            if (errorDetails.context) {
              errorMessage += ` (context: ${JSON.stringify(errorDetails.context)})`;
            }
            
            throw new Error(errorMessage);
          }

          // Update queue item as completed
          await supabase
            .from('analysis_queue')
            .update({ status: 'completed' })
            .eq('id', item.id);

          totalProcessed++;
          logInfo('process-queue', `✅ Completed prompt ${item.prompt_tracking_id}`);
          return { id: item.id, status: 'success' };

        } catch (err: any) {
          logError('process-queue', `❌ Error processing item ${item.id}`, err);
          
          const currentAttempts = (item.attempts || 0) + 1;
          const maxAttempts = 3;
          
          // If we've tried less than max attempts, mark as failed but keep it retryable
          // If we've reached max attempts, mark as permanently failed
          const newStatus = currentAttempts >= maxAttempts ? 'failed' : 'failed';
          
          await supabase
            .from('analysis_queue')
            .update({ 
              status: newStatus,
              error_message: `[Attempt ${currentAttempts}/${maxAttempts}] ${err.message || 'Unknown error'}`,
              attempts: currentAttempts
            })
            .eq('id', item.id);
          
          if (currentAttempts >= maxAttempts) {
            logError('process-queue', `⚠️ Item ${item.id} permanently failed after ${maxAttempts} attempts`);
            totalFailed++;
          } else {
            logInfo('process-queue', `🔄 Item ${item.id} will be retried (attempt ${currentAttempts}/${maxAttempts})`);
          }
          
          return { id: item.id, status: 'failed', error: err.message, attempts: currentAttempts };
        }
      });

      await Promise.allSettled(processingPromises);

      // Small delay between batches to avoid overwhelming the system
      if (items.length === BATCH_SIZE && iterations < MAX_BATCHES_PER_INVOCATION) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Check if there are more items to process
    const { count: remainingCount } = await supabase
      .from('analysis_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('attempts', 3);

    logInfo('process-queue', `Processed ${iterations} batches: ${totalProcessed} successful, ${totalFailed} failed (auto-invoke: ${autoInvokeCount}/${MAX_AUTO_INVOCATIONS})`);
    
    // If there are more items, auto-invoke up to MAX_AUTO_INVOCATIONS times (not infinite recursion)
    // This allows each worker to process more items without overwhelming the system
    if (remainingCount && remainingCount > 0 && autoInvokeCount < MAX_AUTO_INVOCATIONS) {
      logInfo('process-queue', `${remainingCount} items remaining, auto-invoking (${autoInvokeCount + 1}/${MAX_AUTO_INVOCATIONS})`);
      
      // Fire and forget - don't await
      supabase.functions.invoke('process-queue', {
        body: { auto_invoke_count: autoInvokeCount + 1 }
      }).catch(err => {
        logError('process-queue', 'Failed to auto-invoke next batch', err);
      });
    } else if (remainingCount && remainingCount > 0) {
      logInfo('process-queue', `${remainingCount} items remaining but max auto-invocations reached (${autoInvokeCount}/${MAX_AUTO_INVOCATIONS}). Other workers will continue.`);
    } else {
      logInfo('process-queue', 'Queue processing completed - no more items');
    }

    return successResponse({ 
      message: 'Batch processed',
      processed: totalProcessed,
      failed: totalFailed,
      batches: iterations,
      remaining: remainingCount || 0
    });

  } catch (error: any) {
    logError('process-queue', 'Unexpected error', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
