const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// =============================================
// CONFIGURATION
// =============================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
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
  console.error('Usage: node scripts/update-sentiment-for-project.js <project_id>');
  process.exit(1);
}

// =============================================
// SENTIMENT ANALYSIS LOGIC (Copied from Edge Function)
// =============================================

function analyzeSentiment(text) {
  if (!text) return 'neutral';
  
  // Expanded positive keywords (with weights)
  const positiveKeywords = {
    // Strong positive
    'excellent': 3, 'outstanding': 3, 'exceptional': 3, 'superb': 3, 'fantastic': 3,
    'amazing': 3, 'wonderful': 3, 'brilliant': 3, 'perfect': 3, 'ideal': 3,
    // Moderate positive
    'great': 2, 'good': 2, 'best': 2, 'top': 2, 'leading': 2, 'preferred': 2,
    'recommended': 2, 'popular': 2, 'trusted': 2, 'reliable': 2, 'effective': 2,
    'successful': 2, 'innovative': 2, 'advanced': 2, 'powerful': 2, 'efficient': 2,
    // Mild positive
    'nice': 1, 'decent': 1, 'solid': 1, 'fine': 1, 'okay': 1, 'adequate': 1,
    'suitable': 1, 'helpful': 1, 'useful': 1, 'valuable': 1, 'beneficial': 1,
    // Positive verbs
    'love': 2, 'enjoy': 2, 'appreciate': 2, 'prefer': 2, 'choose': 1, 'select': 1,
    // Positive phrases
    'high quality': 2, 'well known': 2, 'well-established': 2, 'highly rated': 2,
    'customer favorite': 2, 'industry leader': 2, 'market leader': 2,
  };

  // Expanded negative keywords (with weights)
  const negativeKeywords = {
    // Strong negative
    'terrible': 3, 'awful': 3, 'horrible': 3, 'worst': 3, 'disastrous': 3,
    'catastrophic': 3, 'unacceptable': 3, 'appalling': 3, 'dreadful': 3,
    // Moderate negative
    'bad': 2, 'poor': 2, 'weak': 2, 'inferior': 2, 'subpar': 2, 'mediocre': 2,
    'disappointing': 2, 'frustrating': 2, 'problematic': 2, 'unreliable': 2,
    'ineffective': 2, 'inefficient': 2, 'outdated': 2, 'limited': 2, 'restrictive': 2,
    // Mild negative
    'not great': 1, 'not good': 1, 'not ideal': 1, 'could be better': 1,
    'lacks': 1, 'missing': 1, 'incomplete': 1, 'insufficient': 1,
    // Negative verbs
    'hate': 2, 'dislike': 2, 'avoid': 1, 'complain': 1, 'criticize': 1,
    // Negative phrases
    'not recommended': 2, 'stay away': 2, 'poor quality': 2, 'low quality': 2,
    'customer complaints': 2, 'frequent issues': 2, 'many problems': 2,
  };

  const lowerText = text.toLowerCase();

  // Calculate positive score
  let positiveScore = 0;
  for (const [keyword, weight] of Object.entries(positiveKeywords)) {
    if (lowerText.includes(keyword)) {
      positiveScore += weight;
    }
  }

  // Calculate negative score
  let negativeScore = 0;
  for (const [keyword, weight] of Object.entries(negativeKeywords)) {
    if (lowerText.includes(keyword)) {
      negativeScore += weight;
    }
  }

  // Check for negations that flip sentiment (e.g., "not good" = negative)
  const negationPatterns = [
    /\bnot\s+(good|great|excellent|best|ideal|recommended|suitable)/gi,
    /\bno\s+(good|great|excellent|best|ideal)/gi,
    /\bdoesn't\s+(work|help|solve)/gi,
    /\bcan't\s+(recommend|use|trust)/gi,
    /\bfails?\s+to/gi,
    /\blacks?\s+(features?|support|quality)/gi,
  ];

  let negationPenalty = 0;
  for (const pattern of negationPatterns) {
    if (pattern.test(text)) {
      negationPenalty += 2; // Penalty for negations
    }
  }

  // Adjust scores with negation penalty
  positiveScore = Math.max(0, positiveScore - negationPenalty);
  negativeScore += negationPenalty;

  // Determine sentiment based on weighted scores
  const threshold = 2; // Minimum score difference to determine sentiment

  if (positiveScore > negativeScore && positiveScore >= threshold) {
    return 'positive';
  }
  if (negativeScore > positiveScore && negativeScore >= threshold) {
    return 'negative';
  }

  // Default to neutral if scores are close or both below threshold
  return 'neutral';
}

// =============================================
// MAIN SCRIPT
// =============================================

async function main() {
  console.log(`Starting sentiment update for project: ${PROJECT_ID}`);

  // 1. Fetch all citations for the project
  // Use pagination to handle large datasets
  let citations = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${page + 1}...`);
    const { data, error } = await supabase
      .from('citations_detail')
      .select('id, citation_text')
      .eq('project_id', PROJECT_ID)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching citations:', error);
      process.exit(1);
    }

    if (data.length < pageSize) {
      hasMore = false;
    }

    citations = [...citations, ...data];
    page++;
  }

  console.log(`Found ${citations.length} citations. Updating sentiments...`);

  // 2. Process citations in batches
  let updatedCount = 0;
  const batchSize = 50;
  
  for (let i = 0; i < citations.length; i += batchSize) {
    const batch = citations.slice(i, i + batchSize);
    
    // Process batch concurrently
    const updates = batch.map(async (citation) => {
      if (!citation.citation_text) return null;
      
      const newSentiment = analyzeSentiment(citation.citation_text);
      
      // Update only if needed (optional check, but good for efficiency)
      // Here we just update blindly to ensure consistency
      
      const { error } = await supabase
        .from('citations_detail')
        .update({ sentiment: newSentiment })
        .eq('id', citation.id);
        
      if (error) {
        console.error(`Error updating citation ${citation.id}:`, error);
        return null;
      }
      
      return newSentiment;
    });

    await Promise.all(updates);
    updatedCount += batch.length;
    process.stdout.write(`\rUpdated ${updatedCount}/${citations.length} citations...`);
  }

  console.log('\nSentiment update complete!');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

