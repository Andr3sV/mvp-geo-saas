// =============================================
// DAILY SENTIMENT EVALUATION
// =============================================
// Runs daily to evaluate sentiment for brands and competitors
// using structured prompts based on extracted topics

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';
import { callGemini, getAPIKey } from '../../lib/ai-clients';

/**
 * Prompt template for sentiment evaluation
 * Format: "Evaluate the [INDUSTRY] company [BRAND] on [TOPIC]"
 */
function buildEvaluationPrompt(industry: string, brandName: string, topic: string): string {
  return `Evaluate the ${industry} company ${brandName} on ${topic}.

Provide a comprehensive evaluation covering:
1. Overall sentiment (positive, neutral, negative, or mixed)
2. Key strengths related to this topic
3. Key weaknesses or areas for improvement
4. Notable attributes or characteristics

Format your response as:

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

ATTRIBUTES:
- [key attribute 1]
- [key attribute 2]
...

SUMMARY:
[Brief 2-3 sentence summary of the evaluation]`;
}

/**
 * Parse the evaluation response to extract structured data
 */
function parseEvaluationResponse(responseText: string): {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore: number;
  strengths: string[];
  weaknesses: string[];
  attributes: string[];
  summary: string;
} {
  const lines = responseText.split('\n').map(line => line.trim());
  
  let sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' = 'neutral';
  let sentimentScore = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const attributes: string[] = [];
  let summary = '';
  
  let currentSection: 'none' | 'strengths' | 'weaknesses' | 'attributes' | 'summary' = 'none';
  
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
    if (lowerLine.startsWith('attributes:') || lowerLine === 'attributes') {
      currentSection = 'attributes';
      continue;
    }
    if (lowerLine.startsWith('summary:') || lowerLine === 'summary') {
      currentSection = 'summary';
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
        case 'attributes':
          attributes.push(content);
          break;
      }
    } else if (currentSection === 'summary' && line) {
      summary += (summary ? ' ' : '') + line;
    }
  }
  
  return {
    sentiment,
    sentimentScore,
    strengths,
    weaknesses,
    attributes,
    summary: summary.trim(),
  };
}

/**
 * Daily cron job to evaluate sentiment for all brands and competitors
 * Runs at 3:00 AM UTC daily
 */
export const dailySentimentEvaluation = inngest.createFunction(
  {
    id: 'daily-sentiment-evaluation',
    name: 'Daily Sentiment Evaluation',
    concurrency: {
      limit: 1, // Only one instance at a time
    },
    retries: 2,
  },
  { cron: '0 3 * * *' }, // 3:00 AM UTC daily
  async ({ step }) => {
    const supabase = createSupabaseClient();
    const startTime = Date.now();

    logInfo('daily-sentiment-evaluation', 'Starting daily sentiment evaluation');

    // 1. Check Gemini API key
    const geminiApiKey = getAPIKey('gemini');
    if (!geminiApiKey) {
      logError('daily-sentiment-evaluation', 'Missing GEMINI_API_KEY');
      return { success: false, error: 'Missing GEMINI_API_KEY' };
    }

    // 2. Get all projects with extracted topics
    const projects = await step.run('fetch-projects', async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, brand_name, industry, extracted_topics')
        .not('industry', 'is', null)
        .not('extracted_topics', 'eq', '[]');

      if (error) {
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      logInfo('daily-sentiment-evaluation', `Found ${data?.length || 0} projects with topics`);
      return data || [];
    });

    if (projects.length === 0) {
      logInfo('daily-sentiment-evaluation', 'No projects with extracted topics found');
      return { success: true, message: 'No projects to evaluate', evaluations: 0 };
    }

    let totalEvaluations = 0;
    let totalErrors = 0;

    // 3. Process each project
    for (const project of projects) {
      const projectResult = await step.run(`evaluate-project-${project.id}`, async () => {
        const topics = project.extracted_topics as string[];
        const brandName = project.brand_name || project.name;
        const industry = project.industry;

        if (!topics || topics.length === 0 || !industry) {
          logInfo('daily-sentiment-evaluation', `Skipping project ${project.id}: no topics or industry`);
          return { evaluations: 0, errors: 0 };
        }

        // Get active competitors for this project
        const { data: competitors, error: competitorsError } = await supabase
          .from('competitors')
          .select('id, name')
          .eq('project_id', project.id)
          .eq('is_active', true);

        if (competitorsError) {
          logError('daily-sentiment-evaluation', `Failed to fetch competitors for project ${project.id}`, competitorsError);
        }

        const activeCompetitors = competitors || [];
        let projectEvaluations = 0;
        let projectErrors = 0;

        // Evaluate each topic for the brand and competitors
        // Limit to first 5 topics per day to avoid rate limits
        const topicsToEvaluate = topics.slice(0, 5);

        for (const topic of topicsToEvaluate) {
          // Evaluate brand
          try {
            const brandPrompt = buildEvaluationPrompt(industry, brandName, topic);
            const brandResult = await callGemini(brandPrompt, {
              apiKey: geminiApiKey,
              model: 'gemini-2.5-flash-lite',
              temperature: 0.3,
              maxTokens: 1500,
            });

            const parsed = parseEvaluationResponse(brandResult.text);

            // Save to brand_evaluations
            const { error: insertError } = await supabase
              .from('brand_evaluations')
              .insert({
                project_id: project.id,
                entity_type: 'brand',
                entity_name: brandName,
                competitor_id: null,
                topic,
                evaluation_prompt: brandPrompt,
                response_text: brandResult.text,
                sentiment: parsed.sentiment,
                sentiment_score: parsed.sentimentScore,
                attributes: {
                  strengths: parsed.strengths,
                  weaknesses: parsed.weaknesses,
                  attributes: parsed.attributes,
                  summary: parsed.summary,
                },
                platform: 'gemini',
              });

            if (insertError) {
              logError('daily-sentiment-evaluation', `Failed to save brand evaluation`, insertError);
              projectErrors++;
            } else {
              projectEvaluations++;
            }

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error: any) {
            logError('daily-sentiment-evaluation', `Brand evaluation failed for ${brandName} on ${topic}`, error);
            projectErrors++;
          }

          // Evaluate each competitor
          for (const competitor of activeCompetitors) {
            try {
              const competitorPrompt = buildEvaluationPrompt(industry, competitor.name, topic);
              const competitorResult = await callGemini(competitorPrompt, {
                apiKey: geminiApiKey,
                model: 'gemini-2.5-flash-lite',
                temperature: 0.3,
                maxTokens: 1500,
              });

              const parsed = parseEvaluationResponse(competitorResult.text);

              // Save to brand_evaluations
              const { error: insertError } = await supabase
                .from('brand_evaluations')
                .insert({
                  project_id: project.id,
                  entity_type: 'competitor',
                  entity_name: competitor.name,
                  competitor_id: competitor.id,
                  topic,
                  evaluation_prompt: competitorPrompt,
                  response_text: competitorResult.text,
                  sentiment: parsed.sentiment,
                  sentiment_score: parsed.sentimentScore,
                  attributes: {
                    strengths: parsed.strengths,
                    weaknesses: parsed.weaknesses,
                    attributes: parsed.attributes,
                    summary: parsed.summary,
                  },
                  platform: 'gemini',
                });

              if (insertError) {
                logError('daily-sentiment-evaluation', `Failed to save competitor evaluation`, insertError);
                projectErrors++;
              } else {
                projectEvaluations++;
              }

              // Small delay to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error: any) {
              logError('daily-sentiment-evaluation', `Competitor evaluation failed for ${competitor.name} on ${topic}`, error);
              projectErrors++;
            }
          }
        }

        logInfo('daily-sentiment-evaluation', `Project ${project.id} completed`, {
          brand: brandName,
          topics_evaluated: topicsToEvaluate.length,
          competitors_evaluated: activeCompetitors.length,
          evaluations: projectEvaluations,
          errors: projectErrors,
        });

        return { evaluations: projectEvaluations, errors: projectErrors };
      });

      totalEvaluations += projectResult.evaluations;
      totalErrors += projectResult.errors;
    }

    const executionTime = Date.now() - startTime;

    logInfo('daily-sentiment-evaluation', 'Daily sentiment evaluation completed', {
      projects_processed: projects.length,
      total_evaluations: totalEvaluations,
      total_errors: totalErrors,
      execution_time_ms: executionTime,
    });

    return {
      success: true,
      projects_processed: projects.length,
      total_evaluations: totalEvaluations,
      total_errors: totalErrors,
      execution_time_ms: executionTime,
    };
  }
);

/**
 * Manual trigger for sentiment evaluation (for testing or on-demand)
 */
export const manualSentimentEvaluation = inngest.createFunction(
  {
    id: 'manual-sentiment-evaluation',
    name: 'Manual Sentiment Evaluation',
    concurrency: {
      limit: 1,
    },
    retries: 1,
  },
  { event: 'sentiment/evaluate-manual' },
  async ({ event, step }) => {
    const { project_id, topics, entity_type, entity_name, competitor_id } = event.data;
    const supabase = createSupabaseClient();

    logInfo('manual-sentiment-evaluation', 'Starting manual evaluation', {
      project_id,
      topics,
      entity_type,
      entity_name,
    });

    // Get project data
    const project = await step.run('fetch-project', async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, brand_name, industry')
        .eq('id', project_id)
        .limit(1);

      if (error) throw new Error(`Failed to fetch project: ${error.message}`);
      if (!data || data.length === 0) throw new Error(`Project not found: ${project_id}`);
      return data[0];
    });

    if (!project.industry) {
      return { success: false, error: 'Project has no industry defined' };
    }

    const geminiApiKey = getAPIKey('gemini');
    if (!geminiApiKey) {
      return { success: false, error: 'Missing GEMINI_API_KEY' };
    }

    const evaluations: any[] = [];
    const topicsToEvaluate = topics || project.extracted_topics || [];

    for (const topic of topicsToEvaluate.slice(0, 10)) {
      const result = await step.run(`evaluate-${topic}`, async () => {
        const prompt = buildEvaluationPrompt(project.industry, entity_name, topic);
        const response = await callGemini(prompt, {
          apiKey: geminiApiKey,
          model: 'gemini-2.5-flash-lite',
          temperature: 0.3,
          maxTokens: 1500,
        });

        const parsed = parseEvaluationResponse(response.text);

        const { error } = await supabase
          .from('brand_evaluations')
          .insert({
            project_id,
            entity_type,
            entity_name,
            competitor_id: competitor_id || null,
            topic,
            evaluation_prompt: prompt,
            response_text: response.text,
            sentiment: parsed.sentiment,
            sentiment_score: parsed.sentimentScore,
            attributes: {
              strengths: parsed.strengths,
              weaknesses: parsed.weaknesses,
              attributes: parsed.attributes,
              summary: parsed.summary,
            },
            platform: 'gemini',
          });

        if (error) throw error;

        return { topic, sentiment: parsed.sentiment, score: parsed.sentimentScore };
      });

      evaluations.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      project_id,
      entity_name,
      evaluations_count: evaluations.length,
      evaluations,
    };
  }
);

