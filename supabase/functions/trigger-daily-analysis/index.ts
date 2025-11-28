/**
 * EDGE FUNCTION: trigger-daily-analysis
 * 
 * Propósito: Se ejecuta diariamente a las 2:00 AM (vía cron job) para:
 * 1. Buscar todos los prompts activos en la base de datos
 * 2. Insertarlos en la cola de análisis (analysis_queue)
 * 3. Disparar múltiples workers en paralelo para procesar la cola
 * 
 * Diseño mejorado para 10,000+ prompts:
 * - Usa cola para persistencia y retry
 * - Dispara múltiples workers en paralelo (no recursión)
 * - Cada worker procesa un lote y termina
 * - Más robusto y escalable
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

    logInfo('trigger-daily-analysis', 'Starting daily analysis trigger');

    // 1. Fetch all active prompts with pagination
    let allPrompts = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: prompts, error } = await supabase
        .from('prompt_tracking')
        .select('id, project_id')
        .eq('is_active', true)
        .range(from, from + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch prompts: ${error.message}`);
      }

      if (prompts && prompts.length > 0) {
        allPrompts = [...allPrompts, ...prompts];
        from += limit;
      } else {
        hasMore = false;
      }
    }

    logInfo('trigger-daily-analysis', `Found ${allPrompts.length} active prompts`);

    if (allPrompts.length === 0) {
      return successResponse({ message: 'No active prompts found' });
    }

    // 2. Prepare queue items
    const batchId = crypto.randomUUID();
    const queueItems = allPrompts.map(p => ({
      prompt_tracking_id: p.id,
      project_id: p.project_id,
      status: 'pending',
      batch_id: batchId
    }));

    // 3. Insert into queue (in batches of 100 to be safe)
    const chunkSize = 100;
    let inserted = 0;
    for (let i = 0; i < queueItems.length; i += chunkSize) {
      const chunk = queueItems.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('analysis_queue')
        .insert(chunk);
      
      if (insertError) {
        logError('trigger-daily-analysis', `Failed to insert chunk ${i}`, insertError);
      } else {
        inserted += chunk.length;
      }
    }

    logInfo('trigger-daily-analysis', `Inserted ${inserted} items into queue with batch ${batchId}`);

    // 4. Trigger multiple workers in parallel (FIRE AND FORGET - don't wait for response)
    // Each worker processes a batch and finishes independently
    // For 10,000+ prompts, we need more workers
    // Each worker processes ~50 prompts, so 20 workers = ~1000 prompts per round
    const NUM_WORKERS = 20;

    logInfo('trigger-daily-analysis', `Triggering ${NUM_WORKERS} workers (fire and forget)`);

    // Fire and forget - don't await, just trigger and return
    // This prevents connection timeouts since we don't wait for workers to finish
    for (let i = 0; i < NUM_WORKERS; i++) {
      // Invoke without awaiting - true fire and forget
      supabase.functions.invoke('process-queue', {
        body: { batch_id: batchId, worker_id: i }
      }).then(() => {
        logInfo('trigger-daily-analysis', `Worker ${i} invocation sent successfully`);
      }).catch(err => {
        logError('trigger-daily-analysis', `Worker ${i} invocation failed`, {
          error: err.message,
          name: err.name
        });
      });
      
      logInfo('trigger-daily-analysis', `Worker ${i + 1}/${NUM_WORKERS} invocation initiated`);
    }

    // Small delay to ensure invocations are sent (but don't wait for responses)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logInfo('trigger-daily-analysis', `All ${NUM_WORKERS} workers triggered (processing in background)`);

    return successResponse({ 
      message: `Scheduled ${inserted} prompts for analysis`,
      batch_id: batchId,
      workers_triggered: NUM_WORKERS,
      note: 'Workers will process the queue. Check analysis_queue table for status.'
    });

  } catch (error) {
    logError('trigger-daily-analysis', 'Unexpected error', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
