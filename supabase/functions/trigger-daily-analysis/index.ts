
/**
 * EDGE FUNCTION: trigger-daily-analysis
 * 
 * Propósito: Se ejecuta diariamente a las 2:00 AM (vía cron job) para:
 * 1. Buscar todos los prompts activos en la base de datos
 * 2. Insertarlos en la cola de análisis (analysis_queue)
 * 3. Disparar el procesamiento llamando a process-queue
 * 
 * Esta función está diseñada para manejar miles de prompts mediante paginación.
 * 
 * Documentación completa: docs/DAILY_ANALYSIS_SYSTEM.md
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

    // 1. Fetch all active prompts
    // Pagination might be needed for thousands, but for now let's fetch 10000
    // Supabase limit is 1000 by default, we need to range it
    
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

      if (prompts.length > 0) {
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
    for (let i = 0; i < queueItems.length; i += chunkSize) {
      const chunk = queueItems.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('analysis_queue')
        .insert(chunk);
      
      if (insertError) {
        logError('trigger-daily-analysis', `Failed to insert chunk ${i}`, insertError);
        // Continue with other chunks or fail? Let's continue but log
      }
    }

    logInfo('trigger-daily-analysis', `Inserted ${queueItems.length} items into queue with batch ${batchId}`);

    // 4. Trigger the worker
    const { error: invokeError } = await supabase.functions.invoke('process-queue', {
      body: { batch_id: batchId }
    });

    if (invokeError) {
      logError('trigger-daily-analysis', 'Failed to trigger process-queue', invokeError);
      // But queue is populated, so a cron or manual retry can pick it up
    }

    return successResponse({ 
      message: `Scheduled ${allPrompts.length} prompts for analysis`,
      batch_id: batchId
    });

  } catch (error) {
    logError('trigger-daily-analysis', 'Unexpected error', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

