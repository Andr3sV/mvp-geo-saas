// =============================================
// SHARED UTILITIES FOR EDGE FUNCTIONS
// =============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// =============================================
// SUPABASE CLIENT
// =============================================

export function createSupabaseClient(authToken?: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      ...(authToken && {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }),
    },
  });
}

// =============================================
// CORS HEADERS
// =============================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================
// RESPONSE HELPERS
// =============================================

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function successResponse(data: any, message?: string) {
  return jsonResponse({ success: true, data, ...(message && { message }) });
}

// =============================================
// AUTHENTICATION
// =============================================

export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createSupabaseClient(token);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Invalid authentication token');
  }

  return { user, supabase };
}

// =============================================
// PROJECT ACCESS VALIDATION
// =============================================

export async function validateProjectAccess(
  supabase: any,
  userId: string,
  projectId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

// =============================================
// RATE LIMITING (Simple implementation)
// =============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// =============================================
// RETRY LOGIC
// =============================================

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
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

export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n');
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

export function logDebug(context: string, message: string, data?: any) {
  if (Deno.env.get('DEBUG') === 'true') {
    console.debug(`[DEBUG] [${context}] ${message}`, data ? JSON.stringify(data) : '');
  }
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

