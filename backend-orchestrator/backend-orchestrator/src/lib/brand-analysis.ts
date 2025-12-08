// =============================================
// BRAND ANALYSIS USING GROQ AI
// =============================================

import { callGroq, getGroqAPIKey, type GroqConfig } from './groq-client';
import type { BrandAnalysisResult } from './types';
import { logError, logInfo } from './utils';

/**
 * Build the brand analysis prompt with dynamic parameters
 */
function buildBrandAnalysisPrompt(
  responseText: string,
  brandName: string,
  competitorList: string[]
): string {
  const competitorsListText = competitorList.length > 0
    ? competitorList.join(', ')
    : '(no competitors defined)';

  return `Role:

You are an information-extraction assistant. Your task is to analyze an AI-generated answer and extract structured data about brand mentions, competitor mentions, sentiment, sentiment scoring, contextual sentiment, attributes, and unlisted brands.

Instructions:

Carefully read the user's answer and perform the following steps. Base your analysis exclusively on the text provided. Do not invent facts that are not present, but you must evaluate both explicit descriptions and contextual clues.

-----------------------------------------

BRAND & COMPETITOR DETECTION

-----------------------------------------

1. Detect whether the client's brand is mentioned.

Return true or false.

2. Identify which competitors from the client's predefined competitor list are mentioned.

Return an array of competitor names that appear in the answer.

3. Identify any additional brands mentioned that are not the client's brand and not part of the competitor list.

Return them exactly as they appear.

-----------------------------------------

SENTIMENT (CATEGORICAL + RATING)

-----------------------------------------

4. Determine the sentiment expressed toward the client's brand.

Allowed values: "positive", "negative", "neutral", "not_mentioned".

5. Provide a sentiment_rating for the client's brand.

A numerical score between -1 and 1:

-1 = fully negative

 0 = neutral

 1 = fully positive

6. Provide a sentiment_ratio for the client's brand.

A floating-point number between 0 and 1 indicating the intensity of the sentiment (0 = no emotional weight, 1 = strong emphasis).

7. Determine the sentiment expressed toward each mentioned competitor.

For each competitor return:

- "competitor"

- "sentiment" (positive / negative / neutral)

8. Provide a sentiment_rating for each competitor.

Use the -1 to 1 scale.

9. Provide a sentiment_ratio for each competitor.

Float between 0 and 1.

-----------------------------------------

CONTEXTUAL SENTIMENT INFERENCE RULES

-----------------------------------------

10. If the client's brand or a competitor is not described with explicit adjectives or opinions, analyze indirect or contextual signals such as:

- placement in "premium", "elegant", "recommended", or "best" lists

- positive or negative framing in surrounding text

- inclusion in or exclusion from favorable recommendations

- positioning relative to praised brands

- context suggesting popularity, quality, value, or prestige

11. When explicit attributes are missing, extract contextual or implied attributes when reasonably grounded in the text.

12. If no sentiment or attributes can be inferred at all, return neutral sentiment and empty attribute arrays.

-----------------------------------------

ATTRIBUTE EXTRACTION

-----------------------------------------

13. Extract positive and negative attributes associated with the client's brand.

Attributes are descriptive qualities, strengths, weaknesses, or perceptions assigned directly or indirectly.

14. Extract positive and negative attributes associated with each competitor brand that appears in the answer.

-----------------------------------------

OUTPUT FORMAT (JSON)

-----------------------------------------

Return only valid JSON with the following structure:

{
  "client_brand_mentioned": true,
  "mentioned_competitors": [],
  "client_brand_sentiment": "neutral",
  "client_brand_sentiment_rating": 0,
  "client_brand_sentiment_ratio": 0.0,
  "competitor_sentiments": [
    {
      "competitor": "",
      "sentiment": "",
      "sentiment_rating": 0,
      "sentiment_ratio": 0.0
    }
  ],
  "client_brand_attributes": {
    "positive": [],
    "negative": []
  },
  "competitor_attributes": [
    {
      "competitor": "",
      "positive": [],
      "negative": []
    }
  ],
  "other_brands_detected": []
}

-----------------------------------------

CLIENT DATA

-----------------------------------------

Client's brand:

${brandName}

Client's predefined competitor list:

${competitorsListText}

-----------------------------------------

ANSWER TO ANALYZE:

${responseText}`;
}

/**
 * Parse and validate the JSON response from Groq
 */
function parseBrandAnalysisResponse(jsonText: string): BrandAnalysisResult {
  try {
    // Remove any markdown code blocks if present
    let cleanedJson = jsonText.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedJson) as BrandAnalysisResult;

    // Validate and set defaults
    return {
      client_brand_mentioned: parsed.client_brand_mentioned ?? false,
      mentioned_competitors: Array.isArray(parsed.mentioned_competitors)
        ? parsed.mentioned_competitors
        : [],
      client_brand_sentiment: parsed.client_brand_sentiment || 'not_mentioned',
      client_brand_sentiment_rating: typeof parsed.client_brand_sentiment_rating === 'number'
        ? Math.max(-1, Math.min(1, parsed.client_brand_sentiment_rating))
        : 0,
      client_brand_sentiment_ratio: typeof parsed.client_brand_sentiment_ratio === 'number'
        ? Math.max(0, Math.min(1, parsed.client_brand_sentiment_ratio))
        : 0,
      competitor_sentiments: Array.isArray(parsed.competitor_sentiments)
        ? parsed.competitor_sentiments.map((cs: any) => ({
            competitor: cs.competitor || '',
            sentiment: cs.sentiment || 'neutral',
            sentiment_rating: typeof cs.sentiment_rating === 'number'
              ? Math.max(-1, Math.min(1, cs.sentiment_rating))
              : 0,
            sentiment_ratio: typeof cs.sentiment_ratio === 'number'
              ? Math.max(0, Math.min(1, cs.sentiment_ratio))
              : 0,
          }))
        : [],
      client_brand_attributes: {
        positive: Array.isArray(parsed.client_brand_attributes?.positive)
          ? parsed.client_brand_attributes.positive
          : [],
        negative: Array.isArray(parsed.client_brand_attributes?.negative)
          ? parsed.client_brand_attributes.negative
          : [],
      },
      competitor_attributes: Array.isArray(parsed.competitor_attributes)
        ? parsed.competitor_attributes.map((ca: any) => ({
            competitor: ca.competitor || '',
            positive: Array.isArray(ca.positive) ? ca.positive : [],
            negative: Array.isArray(ca.negative) ? ca.negative : [],
          }))
        : [],
      other_brands_detected: Array.isArray(parsed.other_brands_detected)
        ? parsed.other_brands_detected
        : [],
    };
  } catch (error: any) {
    logError('brand-analysis', 'Failed to parse JSON response', {
      error: error.message,
      jsonText: jsonText.substring(0, 500), // Log first 500 chars
    });
    throw new Error(`Failed to parse brand analysis JSON: ${error.message}`);
  }
}

/**
 * Analyze brand mentions, sentiment, and attributes in an AI response
 */
export async function analyzeBrandMentions(
  responseText: string,
  brandName: string,
  competitorList: string[],
  config?: Partial<GroqConfig>
): Promise<BrandAnalysisResult> {
  try {
    logInfo('brand-analysis', 'Starting brand analysis', {
      brandName,
      competitorCount: competitorList.length,
      responseLength: responseText.length,
    });

    // Get Groq API key
    const apiKey = config?.apiKey || getGroqAPIKey();
    if (!apiKey) {
      throw new Error('Missing GROQ_API_KEY environment variable');
    }

    // Build prompt
    const prompt = buildBrandAnalysisPrompt(responseText, brandName, competitorList);

    // Call Groq
    const groqConfig: GroqConfig = {
      apiKey,
      model: config?.model || 'openai/gpt-oss-20b',
      temperature: config?.temperature ?? 0.2, // Very low temperature for consistent JSON
      maxTokens: config?.maxTokens ?? 2500, // More tokens for complex responses
    };

    logInfo('brand-analysis', 'Calling Groq API', {
      model: groqConfig.model,
      promptLength: prompt.length,
    });

    const result = await callGroq(prompt, groqConfig);

    logInfo('brand-analysis', 'Groq response received', {
      responseLength: result.text.length,
      tokensUsed: result.tokens_used,
    });

    // Parse and validate JSON
    const analysis = parseBrandAnalysisResponse(result.text);

    logInfo('brand-analysis', 'Brand analysis completed', {
      clientBrandMentioned: analysis.client_brand_mentioned,
      competitorsMentioned: analysis.mentioned_competitors.length,
      otherBrandsDetected: analysis.other_brands_detected.length,
      sentiment: analysis.client_brand_sentiment,
    });

    return analysis;
  } catch (error: any) {
    logError('brand-analysis', 'Brand analysis failed', {
      error: error.message,
      errorType: error.type || 'unknown',
      errorCode: error.code || 'unknown',
      failedGeneration: (error as any).failed_generation || 'none',
    });
    
    // If it's a JSON validation error, log more details
    if (error.code === 'json_validate_failed' || error.message?.includes('validate JSON')) {
      logError('brand-analysis', 'Groq JSON validation failed - this may indicate the prompt needs adjustment', {
        errorDetails: error,
      });
    }
    
    // Return default/empty result on error
    return {
      client_brand_mentioned: false,
      mentioned_competitors: [],
      client_brand_sentiment: 'not_mentioned',
      client_brand_sentiment_rating: 0,
      client_brand_sentiment_ratio: 0,
      competitor_sentiments: [],
      client_brand_attributes: {
        positive: [],
        negative: [],
      },
      competitor_attributes: [],
      other_brands_detected: [],
    };
  }
}

