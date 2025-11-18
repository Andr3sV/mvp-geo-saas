// =============================================
// AI CLIENTS FOR MULTIPLE PROVIDERS
// =============================================

import type { AIProvider, AICompletionResult, AIClientConfig } from './types.ts';
import { calculateCost, logError, logInfo } from './utils.ts';

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
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;

    // Extract text and grounding metadata
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    const estimatedTokens = Math.ceil(text.length / 4);

    // Extract citations from grounding metadata
    // Based on: https://ai.google.dev/gemini-api/docs/google-search
    const citations: string[] = [];
    const groundingMetadata = candidate?.groundingMetadata;
    
    if (groundingMetadata) {
      // According to Gemini docs, groundingChunks contain the real sources
      // The 'uri' field is a Google redirect, but 'title' contains the actual domain
      if (Array.isArray(groundingMetadata.groundingChunks)) {
        groundingMetadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.web?.title) {
            // Use the title field which contains the real domain (e.g., "aljazeera.com")
            // Convert to a proper URL format
            const domain = chunk.web.title.trim();
            // If it's already a domain, prepend https://
            if (!domain.startsWith('http')) {
              citations.push(`https://${domain}`);
            } else {
              citations.push(domain);
            }
            
            logInfo('Gemini', `Extracted citation from title: ${domain}`);
          } else if (chunk.web?.uri && !chunk.web.uri.includes('vertexaisearch')) {
            // Fallback: use URI only if it's not a Google redirect
            citations.push(chunk.web.uri);
          }
        });
      }

      // Debug logging
      if (citations.length === 0) {
        logInfo('Gemini', `No citations extracted. Grounding metadata keys: ${JSON.stringify(Object.keys(groundingMetadata))}`);
        if (groundingMetadata.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
          const sampleChunk = groundingMetadata.groundingChunks[0];
          logInfo('Gemini', `Sample chunk: ${JSON.stringify(sampleChunk)}`);
        }
      } else {
        logInfo('Gemini', `Extracted ${citations.length} citations from groundingChunks`);
      }
    } else {
      logInfo('Gemini', 'No grounding metadata in response. Google Search may not have been triggered.');
    }

    // Remove duplicates and clean URLs
    const uniqueCitations = [...new Set(citations.filter(url => url && url.startsWith('http')))];
    
    // Additional cleanup: remove invalid URLs (Google redirect URLs are now handled via 'title' field)
    const invalidPatterns = [
      'w3.org',            // XML/SVG namespaces
      'xmlns',             // XML namespaces
      'schemas.google',    // Schema definitions
      'json-schema',       // Schema definitions
      'example.com',       // Example domains
      'localhost',         // Local URLs
    ];
    
    const cleanedCitations = uniqueCitations.filter(url => {
      // Remove markdown or special chars
      if (url.includes('[') || url.includes(']')) return false;
      
      // Remove invalid patterns
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
      has_web_search: true, // Using Google Search grounding
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
  const model = config.model || 'claude-haiku-4-5-20251001';

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
  // Use sonar-pro for best web search + citations
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
        // Enable web search and citations
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

    // Extract citations (URLs) from response
    const citations = data.citations || [];
    
    logInfo('Perplexity', `Completion successful. Tokens: ${tokensUsed}, Citations: ${citations.length}, Time: ${executionTime}ms`);

    return {
      text: data.choices[0]?.message?.content || '',
      tokens_used: tokensUsed,
      model,
      cost: calculateCost('perplexity', tokensUsed),
      execution_time_ms: executionTime,
      citations, // URLs from web search
      has_web_search: true, // Perplexity always uses web search
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
    openai: Deno.env.get('OPENAI_API_KEY') ?? '',
    gemini: Deno.env.get('GEMINI_API_KEY') ?? '',
    claude: Deno.env.get('CLAUDE_API_KEY') ?? '',
    perplexity: Deno.env.get('PERPLEXITY_API_KEY') ?? '',
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

