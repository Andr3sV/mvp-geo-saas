const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// =============================================
// CONFIGURATION
// =============================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error('Error: Missing configuration in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const PROJECT_ID = process.argv[2];

if (!PROJECT_ID) {
  console.error('Usage: node scripts/run-advanced-sentiment-analysis.js <project_id>');
  process.exit(1);
}

// =============================================
// AI ANALYSIS LOGIC (Copied from Edge Function)
// =============================================

async function analyzeSentimentWithAI(responseText, brandName, competitors) {
  // Filter out competitors that match the brand name (case-insensitive)
  const lowerBrandName = brandName.toLowerCase().trim();
  const filteredCompetitors = competitors.filter((comp) => {
    const compName = (comp.name || comp).toLowerCase().trim();
    return compName !== lowerBrandName;
  });

  const entities = [
    { name: brandName, type: 'brand' },
    ...filteredCompetitors.map((comp) => ({
      name: comp.name || comp,
      type: 'competitor',
      domain: comp.domain
    }))
  ];

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
${entities.filter((e) => e.type === 'competitor').map((e) => `- ${e.name} → TYPE: "competitor"`).join('\n')}

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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content received from Gemini API');
    }

    // Parse JSON response
    try {
      let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanContent = jsonMatch[0];

      const analysisResult = JSON.parse(cleanContent);
      return analysisResult.analyses || [];
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Gemini API error:', error.message);
    throw error;
  }
}

// =============================================
// MAIN SCRIPT
// =============================================

async function main() {
  console.log(`Starting ADVANCED sentiment analysis for project: ${PROJECT_ID}`);

  // 1. Get Project Info
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('brand_name')
    .eq('id', PROJECT_ID)
    .single();

  if (projectError || !project) {
    console.error('Project not found:', projectError);
    process.exit(1);
  }

  console.log(`Brand Name: ${project.brand_name}`);

  // 2. Get Competitors
  const { data: competitors } = await supabase
    .from('competitors')
    .select('id, name, domain')
    .eq('project_id', PROJECT_ID)
    .eq('is_active', true);

  console.log(`Active Competitors: ${competitors?.length || 0}`);

  // 3. Get Already Processed IDs (to avoid duplicates)
  // We check the 'sentiment_analysis' table to see which ai_response_id already exists
  const { data: processedData } = await supabase
    .from('sentiment_analysis')
    .select('ai_response_id')
    .eq('project_id', PROJECT_ID);

  const processedIds = new Set(processedData?.map(p => p.ai_response_id) || []);
  console.log(`Already processed responses: ${processedIds.size}`);

  // 4. Fetch Pending AI Responses
  // Get all successful responses that haven't been analyzed yet
  let { data: aiResponses, error: responsesError } = await supabase
    .from('ai_responses')
    .select('id, response_text, platform, created_at')
    .eq('project_id', PROJECT_ID)
    .eq('status', 'success')
    .not('response_text', 'is', null);

  if (responsesError) {
    console.error('Error fetching AI responses:', responsesError);
    process.exit(1);
  }

  // Filter out already processed ones locally (supabase 'not.in' has limits on list size)
  const pendingResponses = aiResponses.filter(r => !processedIds.has(r.id));
  console.log(`Found ${pendingResponses.length} responses pending analysis.`);

  // 5. Process sequentially (to avoid rate limits)
  let successCount = 0;
  let errorCount = 0;

  for (const [index, response] of pendingResponses.entries()) {
    const progress = `[${index + 1}/${pendingResponses.length}]`;
    console.log(`${progress} Analyzing response ${response.id} (${response.platform})...`);

    try {
      const results = await analyzeSentimentWithAI(response.response_text, project.brand_name, competitors || []);
      
      if (results.length === 0) {
        console.log(`   -> No relevant entities found in text.`);
        // Debug: show snippet of text to verify if brand was actually there
        const snippet = response.response_text.substring(0, 100).replace(/\n/g, ' ');
        console.log(`      Snippet: "${snippet}..."`);
        
        // Log what we were looking for
        console.log(`      Looking for brand: "${project.brand_name}"`);
        continue;
      }

      // Insert results
      for (const result of results) {
        let competitorId = null;
        if (result.analysis_type === 'competitor') {
          const comp = competitors.find(c => c.name.toLowerCase() === result.entity_name.toLowerCase());
          competitorId = comp?.id || null;
        }

        const { error: insertError } = await supabase.from('sentiment_analysis').insert({
          project_id: PROJECT_ID,
          ai_response_id: response.id,
          analysis_type: result.analysis_type,
          competitor_id: competitorId,
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
          model_used: 'gemini-2.0-flash-exp', // Hardcoded as per edge function
          processing_time_ms: 0 // Not tracking real time here
        });

        if (insertError) {
          console.error(`   -> Error saving result: ${insertError.message}`);
        }
      }

      console.log(`   -> Saved ${results.length} analysis records.`);
      successCount++;
      
      // Small delay to be nice to API (increased to avoid 429 errors)
      console.log('   Waiting 10 seconds to respect rate limits...');
      await new Promise(r => setTimeout(r, 10000));

    } catch (err) {
      console.error(`   -> Failed: ${err.message}`);
      errorCount++;
      
      // If rate limit error, wait even longer
      if (err.message.includes('429')) {
        console.log('   !!! Rate limit hit. Waiting 60 seconds before retrying next item...');
        await new Promise(r => setTimeout(r, 60000));
      }
    }
  }

  console.log('\n=============================================');
  console.log(`COMPLETE! Success: ${successCount}, Errors: ${errorCount}`);
}

main().catch(console.error);

