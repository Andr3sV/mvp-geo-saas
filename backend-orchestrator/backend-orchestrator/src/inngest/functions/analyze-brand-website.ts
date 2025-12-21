// =============================================
// ANALYZE BRAND WEBSITE - Extract Industry & Topics
// =============================================

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';
import { callGemini, getAPIKey } from '../../lib/ai-clients';

/**
 * Prompt template for extracting industry and topics from a brand website
 */
const BRAND_ANALYSIS_PROMPT = `You are an expert in brand analysis, user intent modeling, and sentiment evaluation.

Based ONLY on the content, messaging, and offerings described on the following brand website, perform the tasks below.

1. Identify the primary INDUSTRY and COMPANY TYPE the brand operates in.
   - Be concise and use standardized, user-understandable terms.
   - Example formats:
     - "Online wedding services company"
     - "B2B CRM software company"
     - "Direct-to-consumer skincare brand"

2. Identify the core TOPICS / USER INTENTS that potential customers would commonly evaluate this brand on.
   - Think in terms of how users would naturally ask questions or seek evaluations.
   - Topics should represent products, services, use cases, or decision-making criteria.
   - Avoid internal features or marketing jargon unless they clearly map to user intent.

3. Output between 15 and 30 TOPICS / INTENTS, normalized and non-duplicative.

4. For each TOPIC / INTENT:
   - Use short, evaluable noun phrases (e.g. "pricing", "customer support", "wedding venues", "ease of use").
   - Ensure the topic could naturally complete the sentence:
     "Evaluate the [INDUSTRY / COMPANY TYPE] company [BRAND] on ___."

5. Return the output in the following structured format:

INDUSTRY / COMPANY TYPE:
- <single best description>

TOPICS / USER INTENTS:
- <topic 1>
- <topic 2>
- <topic 3>
...

Do NOT evaluate the brand.
Do NOT include sentiment.
Do NOT include competitors.
Only extract taxonomy suitable for later sentiment evaluation.

Brand website: {WEBSITE_URL}`;

/**
 * Parse the structured response from Gemini to extract industry and topics
 */
function parseAnalysisResponse(responseText: string): {
  industry: string | null;
  topics: string[];
} {
  const lines = responseText.split('\n').map(line => line.trim());
  let industry: string | null = null;
  const topics: string[] = [];
  
  let section: 'none' | 'industry' | 'topics' = 'none';
  
  for (const line of lines) {
    // Detect section headers
    if (line.toLowerCase().includes('industry') && line.toLowerCase().includes('company type')) {
      section = 'industry';
      continue;
    }
    if (line.toLowerCase().includes('topics') || line.toLowerCase().includes('user intents')) {
      section = 'topics';
      continue;
    }
    
    // Parse content based on section
    if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      const content = line.replace(/^[-•*]\s*/, '').trim();
      if (!content) continue;
      
      if (section === 'industry' && !industry) {
        industry = content;
      } else if (section === 'topics') {
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
  }
  
  return { industry, topics };
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
    const { project_id, client_url, force_refresh } = event.data;
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
      const prompt = BRAND_ANALYSIS_PROMPT.replace('{WEBSITE_URL}', client_url);

      logInfo('analyze-brand-website', 'Calling Gemini for website analysis', {
        project_id,
        client_url,
      });

      try {
        const result = await callGemini(prompt, {
          apiKey: geminiApiKey,
          model: 'gemini-2.5-flash-lite',
          temperature: 0.3,
          maxTokens: 2000,
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
      const { error } = await supabase
        .from('projects')
        .update({
          industry: parsedResult.industry,
          extracted_topics: parsedResult.topics,
          topics_extracted_at: new Date().toISOString(),
        })
        .eq('id', project_id);

      if (error) {
        throw new Error(`Failed to save analysis results: ${error.message}`);
      }

      logInfo('analyze-brand-website', 'Saved analysis results to database', {
        project_id,
        industry: parsedResult.industry,
        topics_count: parsedResult.topics.length,
      });

      return { saved: true };
    });

    return {
      success: true,
      project_id,
      industry: parsedResult.industry,
      topics: parsedResult.topics,
      topics_count: parsedResult.topics.length,
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

