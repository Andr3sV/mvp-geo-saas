import { callGemini } from './ai-clients';
import { waitForRateLimit } from './rate-limiter';
import { logInfo } from './utils';
import type { AICompletionResult, AIClientConfig } from './types';

/**
 * Call Gemini with automatic retry for rate limits
 * Retries up to maxRetries times if rate limit is hit
 */
export async function callGeminiWithRetry(
  prompt: string,
  config: AIClientConfig,
  maxRetries: number = 3
): Promise<AICompletionResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait for rate limit before calling Gemini
      const waitTime = await waitForRateLimit('gemini');
      if (waitTime > 0 && attempt === 1) {
        logInfo('sentiment-evaluation', `Waited ${Math.round(waitTime / 1000)}s for Gemini rate limit`);
      }
      
      // Call Gemini
      return await callGemini(prompt, config);
    } catch (err: any) {
      const isRateLimit = err?.isRateLimit || err?.statusCode === 429;
      
      if (isRateLimit && attempt < maxRetries) {
        const waitTime = err?.retryAfter || 60000; // Default 60s if not specified
        logInfo('sentiment-evaluation', `Rate limit hit, waiting ${Math.round(waitTime / 1000)}s before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue; // Retry
      }
      
      // Re-throw if not rate limit or max retries reached
      throw err;
    }
  }
  
  throw new Error(`Failed to call Gemini after ${maxRetries} attempts`);
}

/**
 * Enrich prompt with region-specific context
 */
export function enrichPromptWithRegion(prompt: string, region: string): string {
  if (!region || region === 'GLOBAL') {
    return prompt;
  }
  return `${prompt}\n\nNote: Please provide information relevant to ${region}. Focus on local context, regional brands, and country-specific information when applicable.`;
}

/**
 * Prompt template for sentiment evaluation
 * Format: "Evaluate the [INDUSTRY] company [BRAND] on [TOPIC]"
 * Now includes natural response generation
 */
export function buildEvaluationPrompt(industry: string, brandName: string, topic: string, region?: string): string {
  let prompt = `Evaluate the ${industry} company ${brandName} on ${topic}.

Provide your evaluation in two parts:

PART 1 - STRUCTURED ANALYSIS:
Provide a comprehensive evaluation covering:
1. Overall sentiment (positive, neutral, negative, or mixed)
2. Key strengths related to this topic
3. Key weaknesses or areas for improvement

Format your structured analysis as:

SENTIMENT: [positive/neutral/negative/mixed]
SENTIMENT_SCORE: [number from -1.0 to 1.0, where -1 is very negative, 0 is neutral, 1 is very positive]

STRENGTHS:
- [strength 1]
- [strength 2]
...

WEAKNESSES:
- [weakness 1]
- [weakness 2]
...

SUMMARY:
[Brief 2-3 sentence summary of the evaluation]

PART 2 - NATURAL RESPONSE:
After the structured analysis, write a natural, fluent evaluation (2-3 paragraphs) that could be shown directly to users. Start with an introduction, provide detailed analysis, and conclude with a summary. Use clear, professional language without bullet points or structured formatting.

Format your natural response as:

=== NATURAL_RESPONSE ===
[Your natural evaluation here in 2-3 paragraphs]`;

  // Add region context if provided
  if (region) {
    prompt = enrichPromptWithRegion(prompt, region);
  }

  return prompt;
}

/**
 * Parse the evaluation response to extract structured data and natural response
 */
export function parseEvaluationResponse(responseText: string): {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore: number;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  naturalResponse: string;
} {
  const lines = responseText.split('\n').map(line => line.trim());
  
  let sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' = 'neutral';
  let sentimentScore = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let summary = '';
  let naturalResponse = '';
  
  let currentSection: 'none' | 'strengths' | 'weaknesses' | 'summary' | 'natural' = 'none';
  
  // Check if natural response section exists
  const naturalResponseMarker = '=== NATURAL_RESPONSE ===';
  const naturalResponseIndex = responseText.indexOf(naturalResponseMarker);
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Parse sentiment
    if (lowerLine.startsWith('sentiment:') && !lowerLine.includes('score')) {
      const value = line.split(':')[1]?.trim().toLowerCase();
      if (value === 'positive' || value === 'neutral' || value === 'negative' || value === 'mixed') {
        sentiment = value;
      }
      continue;
    }
    
    // Parse sentiment score
    if (lowerLine.includes('sentiment_score:') || lowerLine.includes('sentiment score:')) {
      const match = line.match(/[-]?\d+\.?\d*/);
      if (match) {
        sentimentScore = Math.max(-1, Math.min(1, parseFloat(match[0])));
      }
      continue;
    }
    
    // Detect section headers
    if (lowerLine.startsWith('strengths:') || lowerLine === 'strengths') {
      currentSection = 'strengths';
      continue;
    }
    if (lowerLine.startsWith('weaknesses:') || lowerLine === 'weaknesses') {
      currentSection = 'weaknesses';
      continue;
    }
    if (lowerLine.startsWith('summary:') || lowerLine === 'summary') {
      currentSection = 'summary';
      continue;
    }
    
    // Detect natural response section
    if (line.includes('=== NATURAL_RESPONSE ===') || lowerLine.includes('part 2') || lowerLine.includes('natural response')) {
      currentSection = 'natural';
      continue;
    }
    
    // Parse content based on section
    if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      const content = line.replace(/^[-•*]\s*/, '').trim();
      if (!content) continue;
      
      switch (currentSection) {
        case 'strengths':
          strengths.push(content);
          break;
        case 'weaknesses':
          weaknesses.push(content);
          break;
      }
    } else if (currentSection === 'summary' && line && !line.includes('=== NATURAL_RESPONSE ===')) {
      summary += (summary ? ' ' : '') + line;
    } else if (currentSection === 'natural' && line && !line.includes('=== NATURAL_RESPONSE ===')) {
      naturalResponse += (naturalResponse ? ' ' : '') + line;
    }
  }
  
  // If natural response wasn't found in structured parsing, extract it from the marker
  if (!naturalResponse && naturalResponseIndex >= 0) {
    naturalResponse = responseText.substring(naturalResponseIndex + naturalResponseMarker.length).trim();
  }
  
  return {
    sentiment,
    sentimentScore,
    strengths,
    weaknesses,
    summary: summary.trim(),
    naturalResponse: naturalResponse.trim(),
  };
}

