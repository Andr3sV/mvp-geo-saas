// =============================================
// PROCESS SINGLE SENTIMENT EVALUATION
// =============================================
// Processes a single sentiment evaluation
// Called by schedule-sentiment-evaluation events

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';
import { getAPIKey } from '../../lib/ai-clients';
import { 
  callGeminiWithRetry, 
  buildEvaluationPrompt, 
  parseEvaluationResponse 
} from '../../lib/sentiment-evaluation-helpers';

export const processSingleSentimentEvaluation = inngest.createFunction(
  {
    id: 'process-single-sentiment-evaluation',
    name: 'Process Single Sentiment Evaluation',
    concurrency: {
      limit: 10, // Process multiple evaluations in parallel
    },
    retries: 2,
  },
  { event: 'sentiment/evaluate-single' },
  async ({ event, step }) => {
    const { project_id, topic, region, entity_type, entity_name, competitor_id } = event.data;
    const supabase = createSupabaseClient();

    logInfo('process-single-sentiment-evaluation', 'Processing evaluation', {
      project_id,
      topic,
      region,
      entity_type,
      entity_name,
      competitor_id,
    });

    // 1. Get project data to extract industry
    const project = await step.run('fetch-project', async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, brand_name, industry')
        .eq('id', project_id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch project: ${error.message}`);
      }

      if (!data.industry) {
        throw new Error(`Project ${project_id} has no industry defined`);
      }

      return data;
    });

    // 2. Check Gemini API key
    const geminiApiKey = getAPIKey('gemini');
    if (!geminiApiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    // 3. Build evaluation prompt
    const prompt = buildEvaluationPrompt(project.industry, entity_name, topic, region);

    // 4. Call Gemini to get evaluation
    const result = await step.run('call-gemini', async () => {
      return await callGeminiWithRetry(prompt, {
        apiKey: geminiApiKey,
        model: 'gemini-2.5-flash-lite',
        temperature: 0.3,
        maxTokens: 2000,
      });
    });

    // 5. Parse evaluation response
    const parsed = await step.run('parse-response', async () => {
      return parseEvaluationResponse(result.text);
    });

    // 6. Save to brand_evaluations
    await step.run('save-evaluation', async () => {
      const { error: insertError } = await supabase
        .from('brand_evaluations')
        .insert({
          project_id,
          entity_type,
          entity_name,
          competitor_id: competitor_id || null,
          topic,
          evaluation_prompt: prompt,
          response_text: result.text,
          sentiment: parsed.sentiment,
          sentiment_score: parsed.sentimentScore,
          positive_attributes: parsed.strengths,
          negative_attributes: parsed.weaknesses,
          natural_response: parsed.naturalResponse || null,
          region: region || 'GLOBAL',
          query_search: result.webSearchQueries || [],
          domains: result.domains || [],
          platform: 'gemini',
        });

      if (insertError) {
        throw new Error(`Failed to save evaluation: ${insertError.message}`);
      }

      logInfo('process-single-sentiment-evaluation', 'Evaluation saved successfully', {
        project_id,
        topic,
        region,
        entity_type,
        entity_name,
        sentiment: parsed.sentiment,
      });
    });

    return {
      success: true,
      project_id,
      topic,
      region,
      entity_type,
      entity_name,
      sentiment: parsed.sentiment,
      sentiment_score: parsed.sentimentScore,
    };
  }
);

