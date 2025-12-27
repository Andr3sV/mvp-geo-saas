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
import { getThemesByProject, getOrCreateTheme } from '../../lib/theme-helpers';

export const processSingleSentimentEvaluation = inngest.createFunction(
  {
    id: 'process-single-sentiment-evaluation',
    name: 'Process Single Sentiment Evaluation',
    concurrency: {
      limit: 5, // Process multiple evaluations in parallel (matches plan limit)
    },
    retries: 2,
  },
  { event: 'sentiment/evaluate-single' },
  async ({ event, step }) => {
    const { project_id, topic, region_id, entity_type, entity_name, competitor_id } = event.data;
    const supabase = createSupabaseClient();

    logInfo('process-single-sentiment-evaluation', 'Processing evaluation', {
      project_id,
      topic,
      region_id,
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

    // 2. Get region code from region_id (if not null, for prompt context)
    const regionCode = await step.run('get-region-code', async () => {
      if (!region_id) {
        return null; // GLOBAL
      }

      const { data: region, error } = await supabase
        .from('regions')
        .select('code')
        .eq('id', region_id)
        .single();

      if (error) {
        logError('process-single-sentiment-evaluation', `Failed to fetch region code for region_id ${region_id}`, error);
        return null;
      }

      return region?.code || null;
    });

    // 3. Fetch existing themes for the project
    const themes = await step.run('fetch-themes', async () => {
      const [positiveThemes, negativeThemes] = await Promise.all([
        getThemesByProject(project_id, 'positive'),
        getThemesByProject(project_id, 'negative'),
      ]);

      logInfo('process-single-sentiment-evaluation', `Fetched ${positiveThemes.length} positive and ${negativeThemes.length} negative themes`, {
        project_id,
      });

      return { positiveThemes, negativeThemes };
    });

    // 4. Check Gemini API key
    const geminiApiKey = getAPIKey('gemini');
    if (!geminiApiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    // 5. Build evaluation prompt with themes
    // Use region code (string) for prompt, or null/undefined for GLOBAL
    const prompt = buildEvaluationPrompt(project.industry, entity_name, topic, {
      region: regionCode || undefined, // Pass code as string or undefined for GLOBAL
      positiveThemes: themes.positiveThemes,
      negativeThemes: themes.negativeThemes,
    });

    // 6. Call Gemini to get evaluation
    const result = await step.run('call-gemini', async () => {
      return await callGeminiWithRetry(prompt, {
        apiKey: geminiApiKey,
        model: 'gemini-2.5-flash-lite',
        temperature: 0.3,
        maxTokens: 2000,
      });
    });

    // 7. Parse evaluation response (now contains theme names)
    const parsed = await step.run('parse-response', async () => {
      return parseEvaluationResponse(result.text, entity_name);
    });

    // 8. Match theme names to existing themes or create new ones
    const themeIds = await step.run('process-themes', async () => {
      const positiveThemeIds: string[] = [];
      const negativeThemeIds: string[] = [];

      // Process positive themes (strengths)
      for (const themeName of parsed.strengths) {
        const theme = await getOrCreateTheme(project_id, themeName, 'positive', entity_name);
        if (theme) {
          positiveThemeIds.push(theme.id);
        } else {
          logError('process-single-sentiment-evaluation', `Failed to get or create positive theme: ${themeName}`, {
            project_id,
            themeName,
            entity_name,
          });
          // Theme validation failed or creation failed - skip it
        }
      }

      // Process negative themes (weaknesses)
      for (const themeName of parsed.weaknesses) {
        const theme = await getOrCreateTheme(project_id, themeName, 'negative', entity_name);
        if (theme) {
          negativeThemeIds.push(theme.id);
        } else {
          logError('process-single-sentiment-evaluation', `Failed to get or create negative theme: ${themeName}`, {
            project_id,
            themeName,
            entity_name,
          });
          // Theme validation failed or creation failed - skip it
        }
      }

      logInfo('process-single-sentiment-evaluation', 'Processed themes', {
        project_id,
        positiveThemes: positiveThemeIds.length,
        negativeThemes: negativeThemeIds.length,
      });

      return { positiveThemeIds, negativeThemeIds };
    });

    // 9. Save to brand_evaluations
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
          sentiment_score: parsed.sentimentScore,
          positive_theme_ids: themeIds.positiveThemeIds,
          negative_theme_ids: themeIds.negativeThemeIds,
          natural_response: parsed.naturalResponse || null,
          region_id: region_id || null, // NULL represents GLOBAL
          query_search: result.webSearchQueries || [],
          uri_sources: result.uriSources || [],
          url_sources: result.urlSources || [],
          platform: 'gemini',
        });

      if (insertError) {
        throw new Error(`Failed to save evaluation: ${insertError.message}`);
      }

      logInfo('process-single-sentiment-evaluation', 'Evaluation saved successfully', {
        project_id,
        topic,
        region_id,
        region_code: regionCode,
        entity_type,
        entity_name,
        sentiment_score: parsed.sentimentScore,
        positiveThemes: themeIds.positiveThemeIds.length,
        negativeThemes: themeIds.negativeThemeIds.length,
        uriSourcesCount: result.uriSources?.length || 0,
        urlSourcesCount: result.urlSources?.length || 0,
      });
    });

    return {
      success: true,
      project_id,
      topic,
      region_id,
      entity_type,
      entity_name,
      sentiment_score: parsed.sentimentScore,
    };
  }
);

