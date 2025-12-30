import { callGemini } from './ai-clients';
import { waitForRateLimit } from './rate-limiter';
import { logInfo } from './utils';
import type { AICompletionResult, AIClientConfig } from './types';
import { validateThemeName } from './theme-helpers';

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
Provide a comprehensive evaluation as you were recomending a brand to a common gemini user. This has to be a natural and human like response covering:
1. Overall sentiment (positive, neutral, negative, or mixed)
2. Key strengths related to this topic according to articles, reviews, and other sources.
3. Key weaknesses or areas for improvement according to articles, reviews, and other sources.

CRITICAL - THEME CATEGORIZATION RULES (READ CAREFULLY):
You MUST categorize each strength/weakness using the following ABSOLUTELY STRICT rules:

⚠️ ABSOLUTELY FORBIDDEN - NEVER DO THIS:
   - NEVER add parentheses, brackets, or any additional details to theme names
   - NEVER create variations like "Brand Heritage (associated with Germany)" - if "Brand Heritage" exists, use ONLY "Brand Heritage"
   - NEVER create "Brand Heritage (Regional Heritage (Spain origin))" - use ONLY "Brand Heritage"
   - NEVER create "Brand Heritage (Distribution Territories (available worldwide))" - use ONLY "Brand Heritage"
   - NEVER create "Brand Heritage (Original Recipe)" - use ONLY "Brand Heritage"
   - NEVER add location, date, or any descriptive details in parentheses
   - NEVER modify existing theme names in any way

1. MATCHING EXISTING THEMES (HIGHEST PRIORITY):
   - If a strength/weakness relates to ANY existing theme (even if worded differently), you MUST use that theme's EXACT name from the list above
   - Be EXTREMELY AGGRESSIVE in matching: ANY concept related to an existing theme MUST use that theme's exact name
   - Examples of what should ALL match "Brand Heritage" if it exists:
     * "Brand Heritage (associated with Germany)" → Use "Brand Heritage"
     * "Brand Heritage (associated with Valencia)" → Use "Brand Heritage"
     * "Brand Heritage (Regional Heritage (Spain origin))" → Use "Brand Heritage"
     * "Brand Heritage (associated with Zaragoza)" → Use "Brand Heritage"
     * "Brand Heritage (Distribution Territories (available worldwide))" → Use "Brand Heritage"
     * "Brand Heritage (associated with Europe)" → Use "Brand Heritage"
     * "Brand Heritage (Original Recipe)" → Use "Brand Heritage"
     * "Strong Brand Heritage" → Use "Brand Heritage"
     * "Regional Heritage" → Use "Brand Heritage"
   - The theme name must be EXACTLY as listed - no modifications, no additions, no variations

2. EXAMPLES OF CORRECT USAGE:
   - Existing theme: "Brand Heritage"
     ✅ CORRECT: "Brand Heritage"
     ❌ WRONG: "Brand Heritage (associated with Germany)"
     ❌ WRONG: "Brand Heritage (Regional Heritage (Spain origin))"
     ❌ WRONG: "Brand Heritage (Distribution Territories)"
     ❌ WRONG: "Strong Brand Heritage"
     ❌ WRONG: "Regional Heritage"
   
   - Existing theme: "Customer Support Response Time"
     ✅ CORRECT: "Customer Support Response Time"
     ❌ WRONG: "Customer Service Answer Time"
     ❌ WRONG: "Client Support Response Time"
     
   - Existing theme: "Customer Support 24/7 availability"
     ✅ CORRECT: "Customer Support 24/7 availability"
     ❌ WRONG: "Customer Service 24/7 availability"
     ❌ WRONG: "Client Support 24/7 availability"

   - Existing theme: "Speed of the application"
     ✅ CORRECT: "Speed of the application"
     ❌ WRONG: "Application Response Time"
     ❌ WRONG: "Application Speed"

3. CREATING NEW THEMES (ONLY IF TRULY NO MATCH EXISTS):
   - Only create a new theme if the concept is COMPLETELY DIFFERENT from all existing themes
   - New theme names must be:
     * Maximum 4 words (e.g., "Brand Heritage", "Customer Support Response Time", "Speed of the application", "Largest Vendor Directory", "Free Samples Available", "vast vendor network" )
     * Not too Broad as sounds like a generic theme and not too specific.
     * Use standard business/marketing terminology
     * ABSOLUTELY NO parentheses, NO brackets, NO additional details
     * NO location names, NO dates, NO specific details
     * DO NOT repeat words in theme names (e.g., "Beer Beer Beer" is INVALID)
     * DO NOT include brand names in theme names (e.g., "Heineken Brand Heritage" is INVALID - use "Brand Heritage" instead)

4. THEME NAMING STANDARDS:
   - Group ALL similar concepts under the SAME theme name
   - Use broad, categorical names that cover all variations
   - If "Brand Heritage" exists, ALL heritage-related concepts must use "Brand Heritage"
   - Ignore location, origin, distribution, recipe details - these are all part of the same theme
   - List each theme only once in strengths section and once in weaknesses section (no duplicates)

5. INVALID THEME NAME EXAMPLES (NEVER CREATE THESE):
   ❌ "Beer Beer Beer Beer Beer" (repeated words)
   ❌ "Heineken Brand Heritage" (contains brand name - use "Brand Heritage" instead)
   ❌ "Product Range Breadth Quality" (more than 2 words - use "Product Range" instead)
   ❌ "Brand Heritage (associated with Germany)" (contains parentheses - use "Brand Heritage" only)
   ❌ "Customer Support 24/7" (too specific - use "Customer Support" only)

Format your structured analysis as:

SENTIMENT: [positive/neutral/negative/mixed]
SENTIMENT_SCORE: [number from -1.0 to 1.0, where -1 is very negative, 0 is neutral, 1 is very positive]

STRENGTHS:
- [EXACT theme name from existing list - NO parentheses, NO brackets, NO additional details, NO modifications, NO repeated words, NO brand names]
- [EXACT theme name from existing list - NO parentheses, NO brackets, NO additional details, NO modifications, NO repeated words, NO brand names]
...
(Each theme should appear only once - no duplicates)

WEAKNESSES:
- [EXACT theme name from existing list - NO parentheses, NO brackets, NO additional details, NO modifications, NO repeated words, NO brand names]
- [EXACT theme name from existing list - NO parentheses, NO brackets, NO additional details, NO modifications, NO repeated words, NO brand names]
...
(Each theme should appear only once - no duplicates)

REMEMBER: If "Brand Heritage" exists in the list, use ONLY "Brand Heritage" - never add location, origin, distribution, or any other details in parentheses or brackets.

PART 2 - NATURAL RESPONSE:
After the structured analysis, write a natural evaluation as I were a gemini chat user, not an api user. it is important show the aswer as you were responding toa common user"

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
 * Build simplified prompt with interpolated values
 * Returns only the first line: "Evaluate the {industry} company {brandName} on {topic}."
 * 
 * @param industry - Industry type (e.g., "supermarket", "B2B CRM")
 * @param brandName - Brand/entity name (e.g., "carrefour", "Salesforce")
 * @param topic - Topic being evaluated (e.g., "customer satisfaction", "pricing")
 * @returns Simplified prompt string
 */
export function buildSimplePrompt(
  industry: string,
  brandName: string,
  topic: string
): string {
  return `Evaluate the ${industry} company ${brandName} on ${topic}.`;
}

/**
 * Clean theme name by removing parentheses, brackets, and additional details
 * This ensures we use only the base theme name even if Gemini adds extra details
 * Returns null if the theme name is invalid and cannot be cleaned
 */
function cleanThemeName(themeName: string, entityName?: string): string | null {
  // Remove everything in parentheses or brackets (including nested)
  let cleaned = themeName
    .replace(/\([^()]*\)/g, '') // Remove simple parentheses
    .replace(/\[[^\]]*\]/g, '') // Remove brackets
    .trim();

  // Remove nested parentheses recursively
  while (cleaned.includes('(') || cleaned.includes(')')) {
    cleaned = cleaned.replace(/\([^()]*\)/g, '').trim();
  }

  // Remove common prefixes that create variations
  cleaned = cleaned
    .replace(/^(Strong|Weak|Excellent|Poor|Great|Bad)\s+/i, '') // Remove intensity adjectives
    .replace(/^(Regional|Local|Global|International)\s+/i, '') // Remove location qualifiers
    .trim();

  // Remove repeated consecutive words
  const words = cleaned.split(/\s+/);
  const deduplicatedWords: string[] = [];
  let lastWord = '';

  for (const word of words) {
    if (word.toLowerCase() !== lastWord.toLowerCase()) {
      deduplicatedWords.push(word);
      lastWord = word;
    }
  }

  cleaned = deduplicatedWords.join(' ').trim();

  // Validate using validation function
  const validation = validateThemeName(cleaned, entityName, 2);
  if (!validation.valid) {
    return null; // Invalid theme name, reject it
  }

  return validation.cleaned || cleaned;
}

/**
 * Parse the evaluation response to extract structured data and natural response
 * Uses Sets for deduplication and limits themes to maxThemesPerCategory (default 20)
 */
export function parseEvaluationResponse(
  responseText: string,
  entityName?: string,
  maxThemesPerCategory: number = 20
): {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore: number;
  strengths: string[];
  weaknesses: string[];
  naturalResponse: string;
} {
  const lines = responseText.split('\n').map(line => line.trim());

  let sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' = 'neutral';
  let sentimentScore = 0;
  // Use Maps to preserve original case while deduplicating by lowercase
  const strengthsMap = new Map<string, string>(); // lowercase -> original case
  const weaknessesMap = new Map<string, string>(); // lowercase -> original case
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
      let content = line.replace(/^[-•*]\s*/, '').trim();
      if (!content) continue;

      // Clean theme name: remove parentheses, brackets, and validate
      // This is a safety measure in case Gemini doesn't follow instructions perfectly
      const cleaned = cleanThemeName(content, entityName);
      if (!cleaned) {
        // Invalid theme name, skip it
        continue;
      }

      // Use lowercase for deduplication, but preserve original case
      const cleanedLower = cleaned.toLowerCase();

      // Only add if we haven't exceeded the limit and haven't seen this theme before
      switch (currentSection) {
        case 'strengths':
          if (!strengthsMap.has(cleanedLower) && strengthsMap.size < maxThemesPerCategory) {
            strengthsMap.set(cleanedLower, cleaned); // Store with preserved case
          }
          break;
        case 'weaknesses':
          if (!weaknessesMap.has(cleanedLower) && weaknessesMap.size < maxThemesPerCategory) {
            weaknessesMap.set(cleanedLower, cleaned); // Store with preserved case
          }
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

  // Convert Maps to arrays (preserving original case)
  const strengths = Array.from(strengthsMap.values());
  const weaknesses = Array.from(weaknessesMap.values());

  return {
    sentiment,
    sentimentScore,
    strengths,
    weaknesses,
    naturalResponse: naturalResponse.trim(),
  };
}

