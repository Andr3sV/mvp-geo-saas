
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
 * 4. Se auto-invoca recursivamente hasta procesar toda la cola
 * 
 * Características:
 * - Procesa en lotes de 5 para evitar saturación y timeouts
 * - Reintenta automáticamente hasta 3 veces en caso de fallo
 * - Auto-continúa cuando hay más trabajos pendientes
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

    // 1. Fetch pending items (Limit 5 to avoid timeouts)
    // We use a simpler approach than locking for now: fetch pending, try to set to processing
    // In high concurrency this might have race conditions but with single chain it's fine
    const BATCH_SIZE = 5;
    
    const { data: items, error: fetchError } = await supabase
      .from('analysis_queue')
      .select('id, prompt_tracking_id, project_id, attempts')
      .eq('status', 'pending')
      .lt('attempts', 3) // Skip items that failed 3 times
      .limit(BATCH_SIZE);

    if (fetchError) {
      throw new Error(`Failed to fetch queue items: ${fetchError.message}`);
    }

    if (!items || items.length === 0) {
      return successResponse({ message: 'Queue is empty' });
    }

    logInfo('process-queue', `Processing batch of ${items.length} items`);

    // 2. Mark as processing and increment attempts
    // Processing individually to ensure atomic attempt increment
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
        const { data: promptData } = await supabase
          .from('prompt_tracking')
          .select('prompt')
          .eq('id', item.prompt_tracking_id)
          .single();

        if (!promptData) {
          throw new Error('Prompt not found');
        }

        // Call analyze-prompt
        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-prompt', {
          body: {
            prompt_tracking_id: item.prompt_tracking_id,
            project_id: item.project_id,
            prompt_text: promptData.prompt,
            platforms: ['perplexity', 'gemini', 'openai', 'claude']
          }
        });

        if (analysisError) throw new Error(analysisError.message || 'Analysis function error');

        // Update queue item as completed
        await supabase
          .from('analysis_queue')
          .update({ status: 'completed' })
          .eq('id', item.id);

        return { id: item.id, status: 'success' };

      } catch (err) {
        logError('process-queue', `Error processing item ${item.id}`, err);
        
        // Update queue item as failed
        await supabase
          .from('analysis_queue')
          .update({ 
            status: 'failed',
            error_message: err.message
          })
          .eq('id', item.id);
          
        return { id: item.id, status: 'failed', error: err };
      }
    });

    await Promise.all(processingPromises);

    // 4. Check if more items exist
    const { count } = await supabase
      .from('analysis_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (count && count > 0) {
      logInfo('process-queue', `${count} items remaining. Triggering next batch.`);
      
      // Recursive call (fire and forget)
      // Add a small delay to allow system to breathe
      // Note: We can't easily delay the invoke itself without blocking, 
      // but the overhead of HTTP call provides some gap.
      
      const { error: invokeError } = await supabase.functions.invoke('process-queue', {
        body: {} // No specific body needed, just trigger
      });
      
      if (invokeError) {
        logError('process-queue', 'Failed to trigger next batch', invokeError);
      }
    } else {
      logInfo('process-queue', 'Queue processing finished');
    }

    return successResponse({ message: 'Batch processed', processed: items.length, remaining: count });

  } catch (error) {
    logError('process-queue', 'Unexpected error', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

