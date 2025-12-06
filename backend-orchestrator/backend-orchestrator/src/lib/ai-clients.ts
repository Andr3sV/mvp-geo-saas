// =============================================
// AI CLIENTS FOR MULTIPLE PROVIDERS
// =============================================

import type { AIProvider, AICompletionResult, AIClientConfig } from './types';
import { calculateCost, logError, logInfo } from './utils';
import { extractGeminiCitations, extractOpenAICitations } from './citation-extraction';

// =============================================
// OPENAI CLIENT
// =============================================

export async function callOpenAI(
  prompt: string,
  config: AIClientConfig
): Promise<AICompletionResult> {
  const startTime = Date.now();
  // Use Responses API with web_search tool for proper citation support
  // Model options: gpt-5, o4-mini, o4, etc. (not gpt-4o-search-preview)
  const model = config.model || 'o4-mini';

  try {
    // Use Responses API with web_search tool (recommended for web search citations)
    // IMPORTANT: Responses API does not support max_tokens, max_output_tokens, or temperature
    // These parameters cause "Unknown parameter" errors - do not include them
    const responseBody: Record<string, any> = {
      model,
      tools: [{ type: 'web_search' }],
      input: prompt,
    };

    // Responses API does not support these parameters - omitting to avoid errors
    // Note: Some models may have default limits, but we cannot control them via API parameters

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(responseBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;

    // Log raw JSON response for debugging (visible in Railway logs)
    console.log('='.repeat(80));
    console.log('[DEBUG] OPENAI RAW API RESPONSE');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));

    // Responses API structure: find message output item with text
    const outputItems = data.output || [];
    let responseText = '';
    let tokensUsed = 0;

    // Extract text from message output item
    for (const item of outputItems) {
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          if (content.type === 'output_text') {
            responseText = content.text || '';
            break;
          }
        }
      }
    }

    // Extract token usage if available (Responses API may structure this differently)
    if (data.usage) {
      tokensUsed = data.usage.total_tokens || 0;
    } else if (data.usage_info) {
      tokensUsed = (data.usage_info.input_tokens || 0) + (data.usage_info.output_tokens || 0);
    }

    // Extract structured citations
    let citationsData: any[] | undefined;
    try {
      citationsData = extractOpenAICitations(data, responseText);
    } catch (error) {
      logError('OpenAI', 'Failed to extract citations', error);
      citationsData = undefined;
    }

    logInfo('OpenAI', `Completion successful. Tokens: ${tokensUsed}, Structured Citations: ${citationsData?.length || 0}, Time: ${executionTime}ms`);

    return {
      text: responseText,
      tokens_used: tokensUsed || Math.ceil(responseText.length / 4), // Estimate if not available
      model,
      cost: calculateCost('openai', tokensUsed || Math.ceil(responseText.length / 4)),
      execution_time_ms: executionTime,
      citationsData: citationsData && citationsData.length > 0 ? citationsData : undefined,
      has_web_search: citationsData && citationsData.length > 0,
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
        const errorDetails = errorData.error?.details || [];
        // Find RetryInfo in the details array
        const retryInfo = errorDetails.find((d: any) => d['@type']?.includes('RetryInfo'));
        const quotaInfo = errorDetails.find((d: any) => d['@type']?.includes('QuotaFailure'));
        
        const retryDelaySeconds = retryInfo?.retryDelay 
          ? parseInt(retryInfo.retryDelay.replace('s', ''))
          : 60; // Default 60 seconds if not specified

        logError('Gemini', `Rate limit exceeded (429). Retry after ${retryDelaySeconds}s`, {
          quotaInfo: quotaInfo?.violations || [],
          retryDelaySeconds,
          quotaLimit: '10 requests per minute per model'
        });
        
        // Throw a special error that can be caught and handled gracefully
        const rateLimitError: any = new Error(`Gemini rate limit exceeded. Quota: 10 req/min. Retry after ${retryDelaySeconds}s`);
        rateLimitError.statusCode = 429;
        rateLimitError.retryAfter = retryDelaySeconds * 1000;
        rateLimitError.isRateLimit = true;
        rateLimitError.quotaLimit = '10 requests per minute per model';
        throw rateLimitError;
      }

      throw new Error(`Gemini API error: ${errorText}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;

    // Log raw JSON response for debugging (visible in Railway logs)
    console.log('='.repeat(80));
    console.log('[DEBUG] GEMINI RAW API RESPONSE');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));
    console.log('[DEBUG] GEMINI GROUNDING METADATA (extracted)');
    console.log(JSON.stringify(data.candidates?.[0]?.groundingMetadata, null, 2));
    console.log('='.repeat(80));

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

    // Extract structured citations using new extraction function
    const citationsData = extractGeminiCitations(data);

    logInfo('Gemini', `Completion successful. Est. Tokens: ${estimatedTokens}, Citations: ${cleanedCitations.length}, Structured Citations: ${citationsData.length}, Time: ${executionTime}ms`);

    return {
      text,
      tokens_used: estimatedTokens,
      model,
      cost: calculateCost('gemini', estimatedTokens),
      execution_time_ms: executionTime,
      citations: cleanedCitations.length > 0 ? cleanedCitations : undefined,
      has_web_search: true,
      citationsData: citationsData.length > 0 ? citationsData : undefined,
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

