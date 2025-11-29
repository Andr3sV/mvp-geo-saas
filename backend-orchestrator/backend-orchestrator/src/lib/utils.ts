// =============================================
// SHARED UTILITIES
// =============================================

import { createClient } from '@supabase/supabase-js';

// =============================================
// SUPABASE CLIENT
// =============================================

export function createSupabaseClient(authToken?: string) {
  // Try both naming conventions (SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    // Detailed error logging
    console.error('=== Supabase Environment Variables Check ===');
    console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set (hidden)' : '❌ Missing');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    
    if (!supabaseUrl) {
      throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    if (!supabaseKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
    }
  });
}

// =============================================
// LOGGING
// =============================================

export function logInfo(context: string, message: string, data?: any) {
  console.log(`[INFO] [${context}] ${message}`, data ? JSON.stringify(data) : '');
}

export function logError(context: string, message: string, error?: any) {
  console.error(`[ERROR] [${context}] ${message}`, error ? error.message || error : '');
}

// =============================================
// COST CALCULATION (Estimated)
// =============================================

export function calculateCost(provider: string, tokens: number): number {
  // Simplified cost calculation (per 1K tokens)
  const costPer1K: Record<string, number> = {
    openai: 0.002, // GPT-4 Turbo pricing
    gemini: 0.001, // Gemini Pro pricing
    claude: 0.003, // Claude 3 pricing
    perplexity: 0.0015, // Perplexity pricing
  };

  const rate = costPer1K[provider] || 0.002;
  return (tokens / 1000) * rate;
}

// =============================================
// TEXT PROCESSING
// =============================================

export function extractContext(
  text: string,
  position: number,
  contextLength = 100
): { before: string; after: string } {
  const before = text.slice(Math.max(0, position - contextLength), position);
  const after = text.slice(position, Math.min(text.length, position + contextLength));

  return { before, after };
}

