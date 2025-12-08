// =============================================
// GROQ CLIENT FOR BRAND ANALYSIS
// =============================================

import { logError, logInfo } from './utils';

export interface GroqConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GroqCompletionResult {
  text: string;
  tokens_used: number;
  model: string;
  cost: number;
  execution_time_ms: number;
}

/**
 * Call Groq API for brand analysis
 * Groq provides fast inference for open-source models like gpt-oss-20b
 */
export async function callGroq(
  prompt: string,
  config: GroqConfig
): Promise<GroqCompletionResult> {
  const startTime = Date.now();
  const model = config.model || 'openai/gpt-oss-20b';

  try {
    // Cap prompt length to avoid excessive token usage
    const MAX_PROMPT_CHARS = 8000;
    const cappedPrompt =
      prompt && prompt.length > MAX_PROMPT_CHARS
        ? prompt.slice(0, MAX_PROMPT_CHARS)
        : prompt;

    // Groq uses OpenAI-compatible Chat Completions API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: cappedPrompt,
          },
        ],
        temperature: config.temperature ?? 0.2, // Very low temperature for consistent JSON
        max_tokens: config.maxTokens ?? 2500, // More tokens for complex responses
        response_format: { type: 'json_object' }, // Force JSON response for structured output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retryDelaySeconds = retryAfter ? parseInt(retryAfter) : 60;

        logError('Groq', `Rate limit exceeded (429). Retry after ${retryDelaySeconds}s`, {
          retryAfter,
          retryDelaySeconds,
        });

        const rateLimitError: any = new Error(
          `Groq rate limit exceeded. Retry after ${retryDelaySeconds}s`
        );
        rateLimitError.statusCode = 429;
        rateLimitError.retryAfter = retryDelaySeconds * 1000;
        rateLimitError.isRateLimit = true;
        throw rateLimitError;
      }

      throw new Error(`Groq API error: ${errorText}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;

    // Extract response text
    const responseText =
      data.choices?.[0]?.message?.content || '';

    // Calculate tokens (Groq includes usage info)
    const tokensUsed =
      data.usage?.total_tokens ||
      Math.ceil((cappedPrompt.length + responseText.length) / 4);

    // Groq is very cost-effective - estimate lower cost
    // gpt-oss-20b through Groq is much cheaper than OpenAI
    const cost = (tokensUsed / 1000000) * 0.27; // Estimated: $0.27 per 1M tokens (Groq pricing)

    logInfo('Groq', `Completion successful. Tokens: ${tokensUsed}, Time: ${executionTime}ms`, {
      model,
      promptChars: cappedPrompt?.length || 0,
      responseChars: responseText.length,
      usage: data.usage || null,
    });

    return {
      text: responseText,
      tokens_used: tokensUsed,
      model,
      cost,
      execution_time_ms: executionTime,
    };
  } catch (error: any) {
    logError('Groq', 'API call failed', error);
    throw error;
  }
}

/**
 * Get Groq API key from environment variables
 */
export function getGroqAPIKey(): string | null {
  const apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) {
    return null;
  }
  return apiKey;
}

