// =============================================
// AI CLIENTS FOR MULTIPLE PROVIDERS
// =============================================

import type { AIProvider, AICompletionResult, AIClientConfig } from './types';
import { calculateCost, logError, logInfo } from './utils';

// =============================================
// OPENAI CLIENT
// =============================================

export async function callOpenAI(
  prompt: string,
  config: AIClientConfig
): Promise<AICompletionResult> {
  const startTime = Date.now();
  const model = config.model || 'gpt-4-turbo-preview';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: prompt,
          },
        ],
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;
    const tokensUsed = data.usage?.total_tokens || 0;

    logInfo('OpenAI', `Completion successful. Tokens: ${tokensUsed}, Time: ${executionTime}ms`);

    return {
      text: data.choices[0]?.message?.content || '',
      tokens_used: tokensUsed,
      model,
      cost: calculateCost('openai', tokensUsed),
      execution_time_ms: executionTime,
    };
  } catch (error) {
    logError('OpenAI', 'API call failed', error);
    throw error;
  }
}

// =============================================
// GEMINI CLIENT
// =============================================

export async function callGemini(
  prompt: string,
  config: AIClientConfig
): Promise<AICompletionResult> {
  const startTime = Date.now();
  const model = config.model || 'gemini-2.0-flash-exp';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.maxTokens || 2000,
          },
          // Enable Google Search grounding (updated API)
          tools: [
            {
              google_search: {},
            },
          ],
        }),
      }
    );

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
        const retryDelay = errorData.error?.details?.[0]?.retryDelay 
          ? parseInt(errorData.error.details[0].retryDelay.replace('s', '')) * 1000
          : 60000; // Default 60 seconds

        logError('Gemini', `Rate limit exceeded. Retry after ${retryDelay}ms`, errorData);
        
        // Throw a special error that can be caught and retried
        const rateLimitError: any = new Error(`Gemini rate limit exceeded. Retry after ${retryDelay}ms`);
        rateLimitError.retryAfter = retryDelay;
        rateLimitError.isRateLimit = true;
        throw rateLimitError;
      }

      throw new Error(`Gemini API error: ${errorText}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;

    // Extract text and grounding metadata
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    const estimatedTokens = Math.ceil(text.length / 4);

    // Extract citations from grounding metadata
    const citations: string[] = [];
    const groundingMetadata = candidate?.groundingMetadata;
    
    if (groundingMetadata) {
      if (Array.isArray(groundingMetadata.groundingChunks)) {
        groundingMetadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.web?.title) {
            const domain = chunk.web.title.trim();
            if (!domain.startsWith('http')) {
              citations.push(`https://${domain}`);
            } else {
              citations.push(domain);
            }
          } else if (chunk.web?.uri && !chunk.web.uri.includes('vertexaisearch')) {
            citations.push(chunk.web.uri);
          }
        });
      }
    }

    const uniqueCitations = [...new Set(citations.filter(url => url && url.startsWith('http')))];
    
    const invalidPatterns = [
      'w3.org', 'xmlns', 'schemas.google', 'json-schema', 'example.com', 'localhost'
    ];
    
    const cleanedCitations = uniqueCitations.filter(url => {
      if (url.includes('[') || url.includes(']')) return false;
      const lowerUrl = url.toLowerCase();
      return !invalidPatterns.some(pattern => lowerUrl.includes(pattern));
    });

    logInfo('Gemini', `Completion successful. Est. Tokens: ${estimatedTokens}, Citations: ${cleanedCitations.length}, Time: ${executionTime}ms`);

    return {
      text,
      tokens_used: estimatedTokens,
      model,
      cost: calculateCost('gemini', estimatedTokens),
      execution_time_ms: executionTime,
      citations: cleanedCitations.length > 0 ? cleanedCitations : undefined,
      has_web_search: true,
    };
  } catch (error) {
    logError('Gemini', 'API call failed', error);
    throw error;
  }
}

// =============================================
// CLAUDE CLIENT
// =============================================

export async function callClaude(
  prompt: string,
  config: AIClientConfig
): Promise<AICompletionResult> {
  const startTime = Date.now();
  const model = config.model || 'claude-haiku-4-5-20251001'; // Updated model name based on provided code, verify if correct for actual usage

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: config.maxTokens || 2000,
        temperature: config.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    logInfo('Claude', `Completion successful. Tokens: ${tokensUsed}, Time: ${executionTime}ms`);

    return {
      text: data.content?.[0]?.text || '',
      tokens_used: tokensUsed,
      model,
      cost: calculateCost('claude', tokensUsed),
      execution_time_ms: executionTime,
    };
  } catch (error) {
    logError('Claude', 'API call failed', error);
    throw error;
  }
}

// =============================================
// PERPLEXITY CLIENT
// =============================================

export async function callPerplexity(
  prompt: string,
  config: AIClientConfig
): Promise<AICompletionResult> {
  const startTime = Date.now();
  const model = config.model || 'sonar-pro';

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
            content: prompt,
          },
        ],
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2000,
        return_citations: true,
        search_domain_filter: [],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${error}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;
    const tokensUsed = data.usage?.total_tokens || 0;
    const citations = data.citations || [];
    
    logInfo('Perplexity', `Completion successful. Tokens: ${tokensUsed}, Citations: ${citations.length}, Time: ${executionTime}ms`);

    return {
      text: data.choices[0]?.message?.content || '',
      tokens_used: tokensUsed,
      model,
      cost: calculateCost('perplexity', tokensUsed),
      execution_time_ms: executionTime,
      citations,
      has_web_search: true,
    };
  } catch (error) {
    logError('Perplexity', 'API call failed', error);
    throw error;
  }
}

// =============================================
// UNIFIED AI CALLER
// =============================================

export async function callAI(
  provider: AIProvider,
  prompt: string,
  config: AIClientConfig
): Promise<AICompletionResult> {
  switch (provider) {
    case 'openai':
      return callOpenAI(prompt, config);
    case 'gemini':
      return callGemini(prompt, config);
    case 'claude':
      return callClaude(prompt, config);
    case 'perplexity':
      return callPerplexity(prompt, config);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// =============================================
// GET API KEY FOR PROVIDER
// =============================================

export function getAPIKey(provider: AIProvider): string | null {
  const keyMap: Record<AIProvider, string> = {
    openai: process.env.OPENAI_API_KEY ?? '',
    gemini: process.env.GEMINI_API_KEY ?? '',
    claude: process.env.CLAUDE_API_KEY ?? '',
    perplexity: process.env.PERPLEXITY_API_KEY ?? '',
  };

  const key = keyMap[provider];
  if (!key) {
    return null;
  }

  return key;
}

// =============================================
// GET AVAILABLE PROVIDERS
// =============================================

export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = ['openai', 'gemini', 'claude', 'perplexity'];
  return providers.filter(provider => getAPIKey(provider) !== null);
}

