// =============================================
// ANALYZE BRAND WEBSITE - Extract Industry & Topics
// =============================================

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';
import { callGemini, getAPIKey } from '../../lib/ai-clients';

/**
 * Prompt template for extracting AEO prompts (Phase 1) and sentiment topics (Phase 2) from a brand website
 */
const BRAND_ANALYSIS_PROMPT = `Act as a Senior Prompt Engineer and expert in AEO (Answer Engine Optimization), Brand Analysis, and User Intent Modeling.

Your objective is to analyze the provided brand data to generate two distinct strategic outputs:
1. An "Unbranded" AEO Visibility Measurement Framework (5 categories & {PROMPTS_QUANTITY} user queries).
2. A Sentiment Evaluation Taxonomy (Industry & Topics).

**INPUT DATA:**
* **Target Brand:** {BRAND_NAME}
* **Target Country:** {COUNTRY} (Use this to localize the competitor analysis and user query context)
* **Website:** {WEBSITE_URL}

Follow these instructions step-by-step:

### PHASE 1: AEO VISIBILITY FRAMEWORK (Brand vs. Competition)
Analyze the website and the Target Brand's position within the {COUNTRY} market. If competitors are not explicitly known, **infer the 4-8 most likely direct competitors** in {COUNTRY}.

1. **Define 5 Strategic Categories:** These must group the ways users search for solutions in this sector *before* they have decided on a specific brand.
   * Focus on problems to be solved, "best of" lists, and category comparisons.
  * Think in terms of how users would naturally ask questions or seek evaluations.
  * Topics should represent products, services, use cases, or decision-making criteria.
  * Avoid internal features or marketing jargon unless they clearly map to user intent.

2. **Generate {PROMPTS_QUANTITY} User Simulation Prompts (approximately {PROMPTS_PER_CATEGORY} per Category):**
   * **CRITICAL CONSTRAINT (Unbranded Queries):** Do **NOT** mention {BRAND_NAME} or any competitor names in these prompts.
   * **Reasoning:** We want to measure "Zero-Click" organic visibility. We need to see if the AI cites {BRAND_NAME} when the user asks a generic category question.
   * **Style:** Natural Language Queries that a real user in {COUNTRY} would type into ChatGPT, Gemini, or Perplexity.
   * **LANGUAGE REQUIREMENT:** All prompts MUST be written in the primary language of {COUNTRY}. For example, if {COUNTRY} is "Spain" or "ES", prompts should be in Spanish. If {COUNTRY} is "United States" or "US", prompts should be in English. Match the language to the country's primary language.
   * *Bad Example:* "Is {BRAND_NAME} good for email marketing?" (Do not use this - mentions brand name).
   * *Good Example (English/US):* "What are the most affordable email marketing tools for startups in 2025?" (Use this).
   * *Good Example (Spanish/ES):* "¿Cuáles son las herramientas de marketing por email más asequibles para startups en 2025?" (Use this).

**Output Format for Phase 1:**

IMPORTANT: You MUST provide your response in JSON format. Include both the categories/prompts AND the inferred competitors in a structured JSON object.

JSON Structure (use code block with json):
\`\`\`json
{
  "categories": [
    {
      "name": "Category Name",
      "prompts": [
        { "text": "Unbranded User Query", "order": 1 },
        { "text": "Unbranded User Query", "order": 2 }
      ]
    }
  ],
  "competitors": [
    { "name": "Competitor Name", "domain": "competitor.com" },
    { "name": "Competitor Name 2", "domain": "competitor2.com" }
  ]
}
\`\`\`

Requirements:
- Provide 5 categories, distributing {PROMPTS_QUANTITY} prompts as evenly as possible across all categories (approximately {PROMPTS_PER_CATEGORY} prompts per category)
- The total number of prompts across all categories must equal exactly {PROMPTS_QUANTITY}
- Infer 4-8 most likely direct competitors in {COUNTRY}
- For each competitor, provide name and domain (website URL)
- Ensure competitor domains are valid URLs (with or without protocol)

If you need to provide additional context, you can include a text explanation, but the JSON object with categories and competitors is REQUIRED.

---

### PHASE 2: SENTIMENT EVALUATION TAXONOMY
Based **ONLY** on the content and offerings found on the {WEBSITE_URL} website, perform the tasks below.

1. Identify the primary INDUSTRY and COMPANY TYPE the brand operates in.
- Be concise and use standardized, user-understandable terms.
- Example formats:
- "Online wedding services company"
- "B2B CRM software company"
- "Direct-to-consumer skincare brand"

2. Identify the core TOPICS / USER INTENTS that potential customers would commonly evaluate this brand on.
   * Think in terms of how users would naturally ask questions or seek evaluations.
* Topics should represent products, services, use cases, or decision-making criteria.
* Avoid internal features or marketing jargon unless they clearly map to user intent.

3. **Output between 15 and 30 TOPICS**, normalized and non-duplicative.

4. **Rules for each TOPIC / INTENT:**
   * Use short, evaluable noun phrases (e.g. "pricing", "customer support", "wedding venues", "ease of use").
   * Ensure the topic could naturally complete the sentence: "Evaluate the [INDUSTRY] company {BRAND_NAME} on ___."

**Constraints for Phase 2:**
* Do NOT evaluate the brand.
* Do NOT include sentiment.
* Do NOT include competitors in the list.
* Only extract the taxonomy.

**Output Format for Phase 2:**

## SENTIMENT TAXONOMY

INDUSTRY / COMPANY TYPE:
- <single best description>

TOPICS / USER INTENTS:
- <topic 1>
- <topic 2>
- <topic 3>
...`;

/**
 * Extract JSON from response text (handles code blocks and pure JSON)
 */
function extractJsonFromResponse(responseText: string): {
  categories: Array<{ name: string; prompts: Array<{ text: string; order: number }> }>;
  competitors?: Array<{ name: string; domain: string }>;
} | null {
  try {
    // Try to find JSON in code blocks first
    // Match from ```json or ``` to ```
    const codeBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      const jsonStr = codeBlockMatch[1].trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.categories && Array.isArray(parsed.categories)) {
        // competitors is optional, but if present should be an array
        return parsed;
      }
    }
    
    // Try to find JSON object in the text (look for { ... } structure with categories)
    const jsonObjectMatch = responseText.match(/\{[\s\S]*"categories"[\s\S]*\}/);
    if (jsonObjectMatch) {
      const parsed = JSON.parse(jsonObjectMatch[0]);
      if (parsed.categories && Array.isArray(parsed.categories)) {
        return parsed;
      }
    }
    
    // Try to parse entire response as JSON
    const parsed = JSON.parse(responseText);
    if (parsed.categories && Array.isArray(parsed.categories)) {
      return parsed;
    }
  } catch (e) {
    // Not valid JSON, return null to use text parser
  }
  return null;
}

/**
 * Parse the structured response from Gemini to extract AEO prompts (Phase 1) and sentiment topics (Phase 2)
 */
function parseAnalysisResponse(responseText: string): {
  industry: string | null;
  topics: string[];
  aeoCategories: Array<{
    name: string;
    prompts: Array<{ text: string; order: number }>;
  }>;
  competitors: Array<{ name: string; domain: string }>;
} {
  // First, try to parse as JSON
  const jsonResult = extractJsonFromResponse(responseText);
  if (jsonResult && jsonResult.categories.length > 0) {
    // JSON parsing successful - use it for AEO categories and competitors
    // Still need to parse industry and topics from text (Phase 2)
    const lines = responseText.split('\n').map(line => line.trim());
    let industry: string | null = null;
    const topics: string[] = [];
    
    let section: 'none' | 'industry' | 'topics' = 'none';
    
    // Parse Phase 2 (sentiment topics) from text
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect Phase 2: Sentiment Taxonomy section
      if (line.toUpperCase().includes('SENTIMENT TAXONOMY') || line.toUpperCase().includes('SENTIMENT')) {
        section = 'none'; // Reset before checking for industry/topics
        continue;
      }
      
      // Detect section headers within sentiment
      if (line.toLowerCase().includes('industry') && line.toLowerCase().includes('company type')) {
        section = 'industry';
        continue;
      }
      if (line.toLowerCase().includes('topics') || line.toLowerCase().includes('user intents')) {
        section = 'topics';
        continue;
      }
      
      // Parse sentiment topics (Phase 2)
      if (section === 'topics') {
        if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
          const content = line.replace(/^[-•*]\s*/, '').trim();
          if (!content) continue;
          
          const normalizedTopic = content
            .toLowerCase()
            .replace(/[.,:;!?]$/g, '')
            .trim();
          if (normalizedTopic && !topics.includes(normalizedTopic)) {
            topics.push(normalizedTopic);
          }
        }
      }
      
      // Parse industry (Phase 2)
      if (section === 'industry') {
        if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
          const content = line.replace(/^[-•*]\s*/, '').trim();
          if (!content) continue;
          
          if (!industry) {
            industry = content;
          }
        }
      }
    }
    
    return {
      industry,
      topics,
      aeoCategories: jsonResult.categories,
      competitors: jsonResult.competitors || [],
    };
  }
  
  // JSON parsing failed - use text parser as fallback
  const lines = responseText.split('\n').map(line => line.trim());
  let industry: string | null = null;
  const topics: string[] = [];
  const aeoCategories: Array<{ name: string; prompts: Array<{ text: string; order: number }> }> = [];
  
  let section: 'none' | 'aeo' | 'industry' | 'topics' = 'none';
  let currentCategory: { name: string; prompts: Array<{ text: string; order: number }> } | null = null;
  let promptOrder = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect Phase 1: AEO Visibility Analysis section
    if (line.toUpperCase().includes('AEO VISIBILITY') || line.toUpperCase().includes('AEO VISIBILITY ANALYSIS')) {
      section = 'aeo';
      continue;
    }
    
    // Detect Phase 2: Sentiment Taxonomy section
    if (line.toUpperCase().includes('SENTIMENT TAXONOMY') || line.toUpperCase().includes('SENTIMENT')) {
      section = 'none'; // Reset before checking for industry/topics
      continue;
    }
    
    // Detect section headers within sentiment
    if (section !== 'aeo') {
      if (line.toLowerCase().includes('industry') && line.toLowerCase().includes('company type')) {
        section = 'industry';
        continue;
      }
      if (line.toLowerCase().includes('topics') || line.toLowerCase().includes('user intents')) {
        section = 'topics';
        continue;
      }
    }
    
    // Parse AEO categories
    if (section === 'aeo') {
      // Detect category header: "### Category X: [Category Name]" or "Category X: [Category Name]"
      const categoryMatch = line.match(/^(?:###\s*)?Category\s+\d+:\s*(.+)$/i);
      if (categoryMatch) {
        // Save previous category if exists
        if (currentCategory && currentCategory.prompts.length > 0) {
          aeoCategories.push(currentCategory);
        }
        currentCategory = {
          name: categoryMatch[1].trim(),
          prompts: [],
        };
        promptOrder = 0;
        continue;
      }
      
      // Parse prompt lines (numbered or bulleted)
      if (currentCategory) {
        // Match: "1. [prompt text]" or "- [prompt text]" or "* [prompt text]"
        const promptMatch = line.match(/^(?:\d+\.|\-|\*)\s*(.+)$/);
        if (promptMatch) {
          promptOrder++;
          currentCategory.prompts.push({
            text: promptMatch[1].trim(),
            order: promptOrder,
          });
        }
      }
    }
    
    // Parse sentiment topics (Phase 2)
    if (section === 'topics') {
      // Parse content based on section
      if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
        const content = line.replace(/^[-•*]\s*/, '').trim();
        if (!content) continue;
        
        // Normalize topic: lowercase, remove extra punctuation
        const normalizedTopic = content
          .toLowerCase()
          .replace(/[.,:;!?]$/g, '')
          .trim();
        if (normalizedTopic && !topics.includes(normalizedTopic)) {
          topics.push(normalizedTopic);
        }
      }
    }
    
    // Parse industry (Phase 2)
    if (section === 'industry') {
      if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
        const content = line.replace(/^[-•*]\s*/, '').trim();
        if (!content) continue;
        
        if (!industry) {
          industry = content;
        }
      }
    }
  }
  
  // Save last category if exists
  if (currentCategory && currentCategory.prompts.length > 0) {
    aeoCategories.push(currentCategory);
  }
  
  // For text parser fallback, competitors are not extracted (return empty array)
  return { industry, topics, aeoCategories, competitors: [] };
}

/**
 * Analyze a brand's website to extract industry and topics
 * Triggered when a project is created or updated with a client_url
 */
export const analyzeBrandWebsite = inngest.createFunction(
  {
    id: 'analyze-brand-website',
    name: 'Analyze Brand Website',
    concurrency: {
      limit: 3, // Limit concurrent executions to avoid Gemini rate limits
    },
    retries: 3,
  },
  { event: 'brand/analyze-website' },
  async ({ event, step }) => {
    const { project_id, client_url, force_refresh, prompts_quantity } = event.data;
    const supabase = createSupabaseClient();

    logInfo('analyze-brand-website', `Starting website analysis for project ${project_id}`, {
      client_url,
      force_refresh,
    });

    // 1. Validate inputs
    if (!project_id || !client_url) {
      logError('analyze-brand-website', 'Missing required parameters', { project_id, client_url });
      return { success: false, error: 'Missing project_id or client_url' };
    }

    // 2. Check if already analyzed (unless force refresh)
    const projectData = await step.run('fetch-project', async () => {
      const { data: project, error } = await supabase
        .from('projects')
        .select('id, name, brand_name, client_url, industry, extracted_topics, topics_extracted_at')
        .eq('id', project_id)
        .limit(1);

      if (error) {
        throw new Error(`Failed to fetch project: ${error.message}`);
      }

      if (!project || project.length === 0) {
        throw new Error(`Project not found: ${project_id}`);
      }

      return project[0];
    });

    // Skip if already analyzed and not forcing refresh
    if (!force_refresh && projectData.topics_extracted_at && projectData.extracted_topics?.length > 0) {
      logInfo('analyze-brand-website', 'Project already analyzed, skipping', {
        project_id,
        topics_extracted_at: projectData.topics_extracted_at,
        topics_count: projectData.extracted_topics.length,
      });
      return {
        success: true,
        skipped: true,
        message: 'Project already analyzed',
        industry: projectData.industry,
        topics: projectData.extracted_topics,
      };
    }

    // 3. Check Gemini API key
    const geminiApiKey = getAPIKey('gemini');
    if (!geminiApiKey) {
      logError('analyze-brand-website', 'Missing GEMINI_API_KEY');
      return { success: false, error: 'Missing GEMINI_API_KEY' };
    }

    // 4. Call Gemini to analyze the website
    const analysisResult = await step.run('analyze-with-gemini', async () => {
      // Get brand name and region for the prompt
      const brandName = projectData.brand_name || projectData.name || 'the brand';
      // Default to 'GLOBAL' or 'US' if region info is not available
      // Region will be fetched from project's default region or regions table if needed
      const country = 'GLOBAL'; // TODO: Fetch from project regions or default region
      
      // Calculate prompts per category (distribute evenly across 5 categories)
      const totalPrompts = prompts_quantity || 50; // Default to 50 if not provided
      const promptsPerCategory = Math.floor(totalPrompts / 5);
      
      let prompt = BRAND_ANALYSIS_PROMPT
        .replace('{WEBSITE_URL}', client_url)
        .replace('{BRAND_NAME}', brandName)
        .replace('{COUNTRY}', country)
        .replace('{PROMPTS_QUANTITY}', totalPrompts.toString())
        .replace('{PROMPTS_PER_CATEGORY}', promptsPerCategory.toString());

      logInfo('analyze-brand-website', 'Calling Gemini for website analysis', {
        project_id,
        client_url,
        brand_name: brandName,
        country,
        prompts_quantity: totalPrompts,
        prompts_per_category: promptsPerCategory,
      });

      try {
        const result = await callGemini(prompt, {
          apiKey: geminiApiKey,
          model: 'gemini-2.5-flash-lite',
          temperature: 0.3,
          maxTokens: Math.max(4000, totalPrompts * 80), // Scale tokens based on prompt quantity (approx 80 tokens per prompt)
        });

        logInfo('analyze-brand-website', 'Gemini response received', {
          project_id,
          response_length: result.text.length,
          has_web_search: result.has_web_search,
        });

        return result;
      } catch (error: any) {
        logError('analyze-brand-website', 'Gemini API call failed', error);
        throw error;
      }
    });

    // 5. Parse the response
    const parsedResult = await step.run('parse-response', async () => {
      const parsed = parseAnalysisResponse(analysisResult.text);

      logInfo('analyze-brand-website', 'Parsed analysis result', {
        project_id,
        industry: parsed.industry,
        topics_count: parsed.topics.length,
      });

      if (!parsed.industry || parsed.topics.length === 0) {
        logError('analyze-brand-website', 'Failed to parse industry or topics from response', {
          response_preview: analysisResult.text.slice(0, 500),
        });
      }

      return parsed;
    });

    // 6. Save results to database
    const saveResult = await step.run('save-to-database', async () => {
      // Prepare suggested_aeo_prompts structure
      const suggestedAeoPrompts = {
        categories: parsedResult.aeoCategories,
        generated_at: new Date().toISOString(),
      };
      
      // Prepare suggested_competitors structure
      const suggestedCompetitors = {
        competitors: parsedResult.competitors,
        generated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('projects')
        .update({
          industry: parsedResult.industry,
          extracted_topics: parsedResult.topics,
          topics_extracted_at: new Date().toISOString(),
          suggested_aeo_prompts: suggestedAeoPrompts,
          suggested_competitors: suggestedCompetitors,
        })
        .eq('id', project_id);

      if (error) {
        throw new Error(`Failed to save analysis results: ${error.message}`);
      }

      logInfo('analyze-brand-website', 'Saved analysis results to database', {
        project_id,
        industry: parsedResult.industry,
        topics_count: parsedResult.topics.length,
        aeo_categories_count: parsedResult.aeoCategories.length,
        aeo_prompts_total: parsedResult.aeoCategories.reduce((sum, cat) => sum + cat.prompts.length, 0),
        competitors_count: parsedResult.competitors.length,
      });

      return { saved: true };
    });

    return {
      success: true,
      project_id,
      industry: parsedResult.industry,
      topics: parsedResult.topics,
      topics_count: parsedResult.topics.length,
      aeo_categories: parsedResult.aeoCategories,
      aeo_prompts_total: parsedResult.aeoCategories.reduce((sum, cat) => sum + cat.prompts.length, 0),
    };
  }
);

/**
 * Helper function to trigger website analysis from the frontend
 * Can be called via API or when a project is created/updated
 */
export async function triggerBrandWebsiteAnalysis(
  projectId: string,
  clientUrl: string,
  forceRefresh = false
): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: 'brand/analyze-website',
    data: {
      project_id: projectId,
      client_url: clientUrl,
      force_refresh: forceRefresh,
    },
  });

  return { eventId: result.ids[0] };
}

