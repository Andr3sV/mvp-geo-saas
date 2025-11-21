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
      .select('brand_name')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get competitors from separate table (include id for foreign key)
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('id, name, domain')
      .eq('project_id', project_id)
      .eq('is_active', true);

    if (competitorsError) {
      console.error('Failed to fetch competitors:', competitorsError);
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
          competitors || []
        );

        const processingTime = Date.now() - startTime;

        // Skip if no results (parsing failed)
        if (!sentimentResults || sentimentResults.length === 0) {
          console.log(`No sentiment results for response ${response.id}, skipping...`);
          results.push({
            ai_response_id: response.id,
            sentiment_count: 0,
            processing_time_ms: processingTime,
            skipped: true
          });
          continue;
        }

        // Save results to database
        for (const result of sentimentResults) {
          // Find competitor_id if this is a competitor analysis
          let competitorId = null;
          if (result.analysis_type === 'competitor') {
            const competitor = (competitors || []).find(
              (c: any) => c.name.toLowerCase() === result.entity_name.toLowerCase()
            );
            competitorId = competitor?.id || null;
          }

          const sentimentRecord = {
            project_id,
            ai_response_id: response.id,
            analysis_type: result.analysis_type,
            competitor_id: competitorId, // NULL for brand, competitor ID for competitors
            entity_name: result.entity_name, // Cached for performance
            entity_domain: result.entity_domain, // Cached for performance
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
  // Filter out competitors that match the brand name (case-insensitive)
  const lowerBrandName = brandName.toLowerCase().trim();
  const filteredCompetitors = competitors.filter((comp: any) => {
    const compName = (comp.name || comp).toLowerCase().trim();
    return compName !== lowerBrandName;
  });

  const entities = [
    { name: brandName, type: 'brand' as const },
    ...filteredCompetitors.map((comp: any) => ({ 
      name: comp.name || comp, 
      type: 'competitor' as const,
      domain: comp.domain 
    }))
  ];

  console.log(`Analyzing sentiment for brand "${brandName}" and ${filteredCompetitors.length} competitors`);

  const prompt = `
You are analyzing sentiment in AI-generated text. You will ONLY analyze the entities listed below. Each entity is pre-classified as either "brand" (the main company) or "competitor".

CRITICAL INSTRUCTIONS:
1. ONLY analyze entities from the list below
2. You MUST use the exact "analysis_type" specified for each entity (do NOT change it)
3. The entity "${brandName}" is the BRAND (analysis_type: "brand")
4. All other entities are COMPETITORS (analysis_type: "competitor")
5. If an entity is not in the list below, DO NOT analyze it

ENTITIES TO ANALYZE (with pre-assigned types):
- ${brandName} → TYPE: "brand" (this is the main brand, NOT a competitor)
${entities.filter(e => e.type === 'competitor').map(e => `- ${e.name} → TYPE: "competitor"`).join('\n')}

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
1. ONLY analyze entities from the list above that are actually mentioned in the text
2. You MUST use the exact "analysis_type" specified above - "${brandName}" is ALWAYS "brand", all others are ALWAYS "competitor"
3. Do NOT change the analysis_type based on the text content
4. Be precise with sentiment scores - consider context and tone
5. Extract specific attributes/mentions, not generic descriptions
6. Provide clear reasoning for sentiment assignment
7. If an entity is not mentioned, don't include it in the response
8. Sentiment labels: positive (0.6-1.0), neutral (0.4-0.6), negative (0.0-0.4)
9. Return valid JSON only, no additional text

REMINDER: "${brandName}" = brand (NOT competitor), all others = competitor
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
      console.error('No content received from Gemini. Response:', JSON.stringify(data));
      throw new Error('No content received from Gemini API');
    }

    // Parse JSON response with better error handling
    try {
      // Remove markdown code blocks and trim
      let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      
      // Sometimes Gemini adds extra text before/after JSON, try to extract just the JSON
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }

      const analysisResult = JSON.parse(cleanContent);

      if (!analysisResult.analyses || !Array.isArray(analysisResult.analyses)) {
        console.error('Invalid analysis result structure:', analysisResult);
        return []; // Return empty array instead of failing
      }

      return analysisResult.analyses;

    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Raw content:', content);
      console.error('Cleaned content:', content.replace(/```json\n?|\n?```/g, '').trim());
      
      // Return empty array instead of throwing - allows other responses to continue processing
      return [];
    }

  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to analyze sentiment: ${error.message}`);
  }
}
