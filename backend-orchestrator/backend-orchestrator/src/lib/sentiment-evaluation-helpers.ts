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
 * Now includes natural response generation and theme-based categorization
 */
export function buildEvaluationPrompt(
  industry: string,
  brandName: string,
  topic: string,
  options?: {
    region?: string;
    positiveThemes?: Array<{ name: string }>;
    negativeThemes?: Array<{ name: string }>;
  }
): string {
  const positiveThemes = options?.positiveThemes || [];
  const negativeThemes = options?.negativeThemes || [];

  let prompt = `Evaluate the ${industry} company ${brandName} on ${topic}.

EXISTING POSITIVE THEMES:
${positiveThemes.length > 0 ? positiveThemes.map(t => `- ${t.name}`).join('\n') : '(No existing positive themes)'}

EXISTING NEGATIVE THEMES:
${negativeThemes.length > 0 ? negativeThemes.map(t => `- ${t.name}`).join('\n') : '(No existing negative themes)'}

Provide your evaluation in two parts:

PART 1 - STRUCTURED ANALYSIS:
Provide a comprehensive evaluation covering:
1. Overall sentiment (positive, neutral, negative, or mixed)
2. Key strengths related to this topic
3. Key weaknesses or areas for improvement

CRITICAL - THEME CATEGORIZATION RULES:
You MUST categorize each strength/weakness using the following strict rules:

1. MATCHING EXISTING THEMES (PRIORITY):
   - If a strength/weakness relates to ANY existing theme (even if worded differently), you MUST use that theme's EXACT name from the list above
   - Be AGGRESSIVE in matching: concepts like "customer support", "customer service", "client assistance", "user help" should ALL match "Customer Support" if it exists
   - Do NOT add any additional text, parentheses, or details to theme names
   - Do NOT create variations like "Strong Brand Heritage" if "Brand Heritage" exists - use "Brand Heritage" exactly
   - Do NOT create "Brand Heritage (Founded in 1864)" - use only "Brand Heritage" if it exists

2. EXAMPLES OF GOOD MATCHING:
   - If theme exists: "Brand Heritage" → Use "Brand Heritage" (NOT "Strong Brand Heritage", NOT "Brand Heritage (Founded in 1864)", NOT "Regional Heritage")
   - If theme exists: "Customer Support" → Use "Customer Support" (NOT "Customer Service", NOT "Client Support", NOT "User Assistance")
   - If theme exists: "Brand Value Leadership" → Use "Brand Value Leadership" (NOT "Brand Value Leadership (Implied through...)", NOT "Value Leadership")

3. CREATING NEW THEMES (ONLY IF NO MATCH):
   - Only create a new theme if the concept is TRULY different from all existing themes
   - New theme names must be:
     * Maximum 4 words
     * Broad enough to cover similar future attributes
     * Use standard business/marketing terminology
     * NO parentheses, NO additional details, NO variations

4. THEME NAMING STANDARDS:
   - Group similar concepts under the same theme name
   - Use broad, categorical names (e.g., "Customer Support" covers all customer service aspects)
   - Avoid specific details that would create duplicate themes

Format your structured analysis as:

SENTIMENT: [positive/neutral/negative/mixed]
SENTIMENT_SCORE: [number from -1.0 to 1.0, where -1 is very negative, 0 is neutral, 1 is very positive]

STRENGTHS:
- [EXACT theme name from existing list OR new broad theme name max 4 words - NO parentheses, NO additional details]
- [EXACT theme name from existing list OR new broad theme name max 4 words - NO parentheses, NO additional details]
...

WEAKNESSES:
- [EXACT theme name from existing list OR new broad theme name max 4 words - NO parentheses, NO additional details]
- [EXACT theme name from existing list OR new broad theme name max 4 words - NO parentheses, NO additional details]
...

PART 2 - NATURAL RESPONSE:
After the structured analysis, write a natural evaluation as I were a gemini chat user, not an api user. 

Format your natural response as:

=== NATURAL_RESPONSE ===
[Your natural evaluation here]`;

  // Add region context if provided
  if (options?.region) {
    prompt = enrichPromptWithRegion(prompt, options.region);
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
  naturalResponse: string;
} {
  const lines = responseText.split('\n').map(line => line.trim());
  
  let sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' = 'neutral';
  let sentimentScore = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let naturalResponse = '';
  
  let currentSection: 'none' | 'strengths' | 'weaknesses' | 'natural' = 'none';
  
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
    naturalResponse: naturalResponse.trim(),
  };
}

