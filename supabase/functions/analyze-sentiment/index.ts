import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SentimentAnalysisRequest {
  project_id: string;
  ai_response_id?: string; // Optional - if not provided, analyze all unprocessed responses
  force_reanalysis?: boolean; // Force re-analysis of already processed responses
}

interface SentimentResult {
  analysis_type: 'brand' | 'competitor';
  entity_name: string;
  entity_domain?: string;
  overall_sentiment: number;
  sentiment_label: 'positive' | 'neutral' | 'negative';
  confidence_score: number;
  positive_attributes: string[];
  neutral_attributes: string[];
  negative_attributes: string[];
  analyzed_text: string;
  ai_reasoning: string;
  key_phrases: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { project_id, ai_response_id, force_reanalysis = false }: SentimentAnalysisRequest = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'project_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get project details for brand information
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('brand_name, competitors')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for AI responses to analyze
    let query = supabase
      .from('ai_responses')
      .select('id, response_text, platform, created_at')
      .eq('project_id', project_id)
      .eq('status', 'success')
      .not('response_text', 'is', null);

    // If specific response ID provided, analyze only that one
    if (ai_response_id) {
      query = query.eq('id', ai_response_id);
    }

    // If not forcing reanalysis, exclude already processed responses
    if (!force_reanalysis) {
      const { data: processedIds } = await supabase
        .from('sentiment_analysis')
        .select('ai_response_id')
        .eq('project_id', project_id);
      
      if (processedIds && processedIds.length > 0) {
        const processedResponseIds = processedIds.map(p => p.ai_response_id);
        query = query.not('id', 'in', `(${processedResponseIds.join(',')})`);
      }
    }

    const { data: aiResponses, error: responsesError } = await query.limit(50); // Process in batches

    if (responsesError) {
      throw new Error(`Failed to fetch AI responses: ${responsesError.message}`);
    }

    if (!aiResponses || aiResponses.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No responses to analyze',
          processed_count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    let processedCount = 0;

    for (const response of aiResponses) {
      try {
        const startTime = Date.now();
        
        // Analyze sentiment using Gemini 2.0 Flash
        const sentimentResults = await analyzeSentimentWithAI(
          response.response_text,
          project.brand_name,
          project.competitors || []
        );

        const processingTime = Date.now() - startTime;

        // Save results to database
        for (const result of sentimentResults) {
          const sentimentRecord = {
            project_id,
            ai_response_id: response.id,
            analysis_type: result.analysis_type,
            entity_name: result.entity_name,
            entity_domain: result.entity_domain,
            overall_sentiment: result.overall_sentiment,
            sentiment_label: result.sentiment_label,
            confidence_score: result.confidence_score,
            positive_attributes: result.positive_attributes,
            neutral_attributes: result.neutral_attributes,
            negative_attributes: result.negative_attributes,
            analyzed_text: result.analyzed_text,
            ai_reasoning: result.ai_reasoning,
            key_phrases: result.key_phrases,
            model_used: 'gemini-2.0-flash-exp',
            processing_time_ms: processingTime
          };

          const { error: insertError } = await supabase
            .from('sentiment_analysis')
            .insert(sentimentRecord);

          if (insertError) {
            console.error('Failed to insert sentiment analysis:', insertError);
          }
        }

        results.push({
          ai_response_id: response.id,
          sentiment_count: sentimentResults.length,
          processing_time_ms: processingTime
        });

        processedCount++;

      } catch (error) {
        console.error(`Failed to analyze response ${response.id}:`, error);
        results.push({
          ai_response_id: response.id,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedCount,
        total_responses: aiResponses.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeSentimentWithAI(
  responseText: string,
  brandName: string,
  competitors: any[]
): Promise<SentimentResult[]> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Prepare entities to analyze (brand + competitors)
  const entities = [
    { name: brandName, type: 'brand' as const },
    ...competitors.map((comp: any) => ({ 
      name: comp.name || comp, 
      type: 'competitor' as const,
      domain: comp.domain 
    }))
  ];

  const prompt = `
Analyze the sentiment for each mentioned entity in the following AI response text. For each entity found, provide detailed sentiment analysis.

ENTITIES TO ANALYZE:
${entities.map(e => `- ${e.name} (${e.type})`).join('\n')}

TEXT TO ANALYZE:
"""
${responseText}
"""

For each entity mentioned in the text, provide analysis in this EXACT JSON format:
{
  "analyses": [
    {
      "analysis_type": "brand" | "competitor",
      "entity_name": "exact entity name",
      "entity_domain": "domain if known, null otherwise",
      "overall_sentiment": 0.75, // 0-1 scale: 0=very negative, 0.5=neutral, 1=very positive
      "sentiment_label": "positive" | "neutral" | "negative", // positive: 0.6-1.0, neutral: 0.4-0.6, negative: 0.0-0.4
      "confidence_score": 0.85, // 0-1 confidence in analysis
      "positive_attributes": ["high quality", "innovative design"], // specific positive mentions
      "neutral_attributes": ["available in stores", "founded in 1990"], // factual/neutral mentions
      "negative_attributes": ["expensive", "limited availability"], // specific negative mentions
      "analyzed_text": "exact portion of text analyzed for this entity",
      "ai_reasoning": "brief explanation of why this sentiment was assigned",
      "key_phrases": ["key phrase 1", "key phrase 2"] // important phrases that influenced sentiment
    }
  ]
}

IMPORTANT RULES:
1. Only analyze entities that are actually mentioned in the text
2. Be precise with sentiment scores - consider context and tone
3. Extract specific attributes/mentions, not generic descriptions
4. Provide clear reasoning for sentiment assignment
5. If an entity is not mentioned, don't include it in the response
6. Sentiment labels: positive (0.6-1.0), neutral (0.4-0.6), negative (0.0-0.4)
7. Return valid JSON only, no additional text
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent analysis
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content received from Gemini API');
    }

    // Parse JSON response
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const analysisResult = JSON.parse(cleanContent);

    return analysisResult.analyses || [];

  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to analyze sentiment: ${error.message}`);
  }
}
