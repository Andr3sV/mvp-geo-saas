import { createClient } from '@/lib/supabase/client';

export interface SentimentFilterOptions {
  dateRange?: {
    from: Date;
    to: Date;
  };
  platform?: string;
  region?: string;
  topicId?: string; // Filter by specific topic
  analysisType?: 'brand' | 'competitor' | 'all';
  sentimentLabel?: 'positive' | 'neutral' | 'negative' | 'all';
  entityName?: string; // Filter by specific entity name
  competitorId?: string; // Filter by specific competitor ID
}

export interface SentimentMetrics {
  totalAnalyses: number; // Deprecated: use totalUniqueAnalyzedResponses
  totalUniqueAnalyzedResponses: number; // Unique responses analyzed
  totalSentimentRows: number; // Total rows in brand_sentiment_attributes table
  brandAnalyses: number;
  competitorAnalyses: number;
  averageSentiment: number; // Overall average sentiment
  overallSentiment: number; // Alias for averageSentiment
  brandSentiment: number; // Brand-specific sentiment
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  confidenceScore: number;
}

export interface SentimentTrend {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  totalAnalyses: number;
  averageSentiment: number;
}

export interface EntitySentiment {
  entityName: string;
  entityDomain?: string;
  analysisType: 'brand' | 'competitor';
  totalMentions: number;
  averageSentiment: number;
  sentimentLabel: 'positive' | 'neutral' | 'negative';
  confidenceScore: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  topPositiveAttributes: string[];
  topNegativeAttributes: string[];
  recentAnalyses: Array<{
    id: string;
    analyzedText: string;
    overallSentiment: number;
    sentimentLabel: string;
    aiReasoning: string;
    createdAt: string;
    platform: string;
  }>;
}

export interface AttributeAnalysis {
  attribute: string;
  entityName: string;
  analysisType: 'brand' | 'competitor';
  sentimentType: 'positive' | 'neutral' | 'negative';
  frequency: number;
  averageSentiment: number;
  examples: Array<{
    text: string;
    sentiment: number;
    platform: string;
    createdAt: string;
  }>;
}

export async function getSentimentMetrics(
  projectId: string,
  filters: SentimentFilterOptions = {}
): Promise<SentimentMetrics> {
  const supabase = createClient();

  try {
    // Query brand_sentiment_attributes instead of sentiment_analysis
    const { data: sentimentData, error } = await supabase
      .from('brand_sentiment_attributes')
      .select('brand_type, sentiment, sentiment_rating, sentiment_ratio')
      .eq('project_id', projectId);

    if (error) {
      console.log('Brand sentiment attributes table error:', error.message);
      // Return empty metrics if query fails
      return {
        totalAnalyses: 0,
        totalUniqueAnalyzedResponses: 0,
        totalSentimentRows: 0,
        brandAnalyses: 0,
        competitorAnalyses: 0,
        averageSentiment: 0,
        overallSentiment: 0,
        brandSentiment: 0,
        sentimentDistribution: {
          positive: 0,
          neutral: 0,
          negative: 0,
        },
        confidenceScore: 0.5,
      };
    }

    const analysesData = sentimentData || [];
    const totalSentimentRows = analysesData.length;
    
    // Count unique responses
    const uniqueResponseIds = new Set(
      analysesData.map((a: any) => a.ai_response_id)
    );
    const totalUniqueAnalyzedResponses = uniqueResponseIds.size;
    
    const brandAnalyses = analysesData.filter((a: any) => a.brand_type === 'client').length;
    const competitorAnalyses = analysesData.filter((a: any) => a.brand_type === 'competitor').length;

    // Calculate average sentiment using sentiment_rating (range -1 to 1, normalized to 0-1)
    const averageSentiment = totalSentimentRows > 0 
      ? analysesData.reduce((sum: number, a: any) => {
          // Convert sentiment_rating from -1..1 to 0..1 range
          const normalized = (a.sentiment_rating + 1) / 2;
          return sum + normalized;
        }, 0) / totalSentimentRows 
      : 0.5;

    // Sentiment distribution based on 'sentiment' field
    const sentimentDistribution = {
      positive: analysesData.filter((a: any) => a.sentiment === 'positive').length,
      neutral: analysesData.filter((a: any) => a.sentiment === 'neutral').length,
      negative: analysesData.filter((a: any) => a.sentiment === 'negative').length,
    };

    // Calculate brand-specific sentiment
    const brandData = analysesData.filter((a: any) => a.brand_type === 'client');
    const brandSentiment = brandData.length > 0
      ? brandData.reduce((sum: number, a: any) => {
          const normalized = (a.sentiment_rating + 1) / 2;
          return sum + normalized;
        }, 0) / brandData.length
      : 0.5;

    // Use sentiment_ratio as confidence score (average)
    const confidenceScore = totalSentimentRows > 0
      ? analysesData.reduce((sum: number, a: any) => sum + (a.sentiment_ratio || 0.5), 0) / totalSentimentRows
      : 0.5;

    return {
      totalAnalyses: totalUniqueAnalyzedResponses,
      totalUniqueAnalyzedResponses,
      totalSentimentRows,
      brandAnalyses,
      competitorAnalyses,
      averageSentiment,
      overallSentiment: averageSentiment,
      brandSentiment,
      sentimentDistribution,
      confidenceScore,
    };
  } catch (error: any) {
    console.error('Error fetching sentiment metrics:', error);
    return {
      totalAnalyses: 0,
      totalUniqueAnalyzedResponses: 0,
      totalSentimentRows: 0,
      brandAnalyses: 0,
      competitorAnalyses: 0,
      averageSentiment: 0,
      overallSentiment: 0,
      brandSentiment: 0,
      sentimentDistribution: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      confidenceScore: 0.5,
    };
  }
}

export async function getSentimentTrends(
  projectId: string,
  filters: SentimentFilterOptions = {}
): Promise<SentimentTrend[]> {
  try {
    const supabase = createClient();

    const endDate = filters.dateRange?.to || new Date();
    const startDate = filters.dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Query brand_sentiment_attributes with joins to ai_responses
    let query = supabase
      .from('brand_sentiment_attributes')
      .select(`
        sentiment,
        sentiment_rating,
        ai_response_id,
        brand_type,
        competitor_id,
        ai_responses!inner(
          created_at,
          platform,
          prompt_tracking!inner(region)
        )
      `)
      .eq('project_id', projectId)
      .gte('ai_responses.created_at', startDate.toISOString())
      .lte('ai_responses.created_at', endDate.toISOString());

    // Apply filters
    if (filters.analysisType && filters.analysisType !== 'all') {
      const brandType = filters.analysisType === 'brand' ? 'client' : 'competitor';
      query = query.eq('brand_type', brandType);
    }
    
    if (filters.platform && filters.platform !== 'all') {
      query = query.eq('ai_responses.platform', filters.platform);
    }
    
    if (filters.region && filters.region !== 'all') {
      query = query.eq('ai_responses.prompt_tracking.region', filters.region);
    }
    
    if (filters.competitorId) {
      query = query.eq('competitor_id', filters.competitorId);
    }

    const { data: trendData, error: trendError } = await query;

    if (trendError) {
      console.error('Failed to fetch sentiment trends:', trendError.message);
      return [];
    }

    // Group by date and calculate metrics
    const trendMap = new Map<string, {
      positive: number;
      neutral: number;
      negative: number;
      totalAnalyses: number;
      sentimentSum: number;
    }>();

    (trendData || []).forEach((analysis: any) => {
      const responseDate = analysis.ai_responses?.created_at;
      if (!responseDate) {
        return;
      }
      
      const date = new Date(responseDate).toISOString().split('T')[0];
      
      const existing = trendMap.get(date) || {
        positive: 0,
        neutral: 0,
        negative: 0,
        totalAnalyses: 0,
        sentimentSum: 0,
      };

      if (analysis.sentiment === 'positive') existing.positive++;
      else if (analysis.sentiment === 'neutral') existing.neutral++;
      else if (analysis.sentiment === 'negative') existing.negative++;
      
      existing.totalAnalyses++;
      // Convert sentiment_rating from -1..1 to 0..1 range
      const normalizedSentiment = (analysis.sentiment_rating + 1) / 2;
      existing.sentimentSum += normalizedSentiment;

      trendMap.set(date, existing);
    });

    // Convert to array and calculate averages
    return Array.from(trendMap.entries())
      .map(([date, metrics]) => ({
        date,
        positive: metrics.positive,
        neutral: metrics.neutral,
        negative: metrics.negative,
        totalAnalyses: metrics.totalAnalyses,
        averageSentiment: metrics.totalAnalyses > 0 ? metrics.sentimentSum / metrics.totalAnalyses : 0.5,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error: any) {
    console.error('Error fetching sentiment trends:', error);
    return [];
  }
}

export async function getEntitySentiments(
  projectId: string,
  filters: SentimentFilterOptions = {}
): Promise<EntitySentiment[]> {
  try {
    const supabase = createClient();

    // Query brand_sentiment_attributes - entity_name is already in the table
    const { data: sentimentData, error } = await supabase
      .from('brand_sentiment_attributes')
      .select(`
        *,
        ai_responses!inner(platform, created_at)
      `)
      .eq('project_id', projectId);

    if (error) {
      console.log('Brand sentiment attributes not ready for entities:', error.message);
      return [];
    }

    // Group by entity
    const entityMap = new Map<string, any[]>();

    (sentimentData || []).forEach((analysis: any) => {
      const entityName = analysis.entity_name || 'Unknown';
      const key = `${entityName}-${analysis.brand_type}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, []);
      }
      entityMap.get(key)!.push(analysis);
    });

    // Process each entity
    return Array.from(entityMap.entries()).map(([key, analyses]) => {
      const firstAnalysis = analyses[0];
      const entityName = firstAnalysis.entity_name || 'Unknown';
      const totalMentions = analyses.length;
      
      // Average sentiment (convert from -1..1 to 0..1)
      const averageSentiment = analyses.reduce((sum, a) => {
        const normalized = (a.sentiment_rating + 1) / 2;
        return sum + normalized;
      }, 0) / totalMentions;
      
      // Use sentiment_ratio as confidence
      const confidenceScore = analyses.reduce((sum, a) => sum + (a.sentiment_ratio || 0.5), 0) / totalMentions;
      
      const positiveCount = analyses.filter(a => a.sentiment === 'positive').length;
      const neutralCount = analyses.filter(a => a.sentiment === 'neutral').length;
      const negativeCount = analyses.filter(a => a.sentiment === 'negative').length;
      
      // Determine overall sentiment label
      let sentimentLabel: 'positive' | 'neutral' | 'negative' = 'neutral';
      if (averageSentiment >= 0.6) sentimentLabel = 'positive';
      else if (averageSentiment <= 0.4) sentimentLabel = 'negative';
      
      // Extract top attributes (now stored as JSONB arrays)
      const allPositiveAttributes = analyses.flatMap(a => a.positive_attributes || []);
      const allNegativeAttributes = analyses.flatMap(a => a.negative_attributes || []);
      
      const topPositiveAttributes = getTopAttributes(allPositiveAttributes);
      const topNegativeAttributes = getTopAttributes(allNegativeAttributes);
      
      // Get recent analyses
      const recentAnalyses = analyses
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          analyzedText: a.analyzed_text || '',
          overallSentiment: (a.sentiment_rating + 1) / 2, // Normalize to 0-1
          sentimentLabel: a.sentiment,
          aiReasoning: a.model_used || 'groq',
          createdAt: a.created_at,
          platform: a.ai_responses?.platform || 'Unknown',
        }));

      const analysisType: 'brand' | 'competitor' = firstAnalysis.brand_type === 'client' ? 'brand' : 'competitor';
      
      return {
        entityName,
        entityDomain: '', // Not stored in brand_sentiment_attributes
        analysisType,
        totalMentions,
        averageSentiment,
        sentimentLabel,
        confidenceScore,
        positiveCount,
        neutralCount,
        negativeCount,
        topPositiveAttributes,
        topNegativeAttributes,
        recentAnalyses,
      };
    }).sort((a, b) => b.totalMentions - a.totalMentions);
  } catch (error: any) {
    console.error('Error fetching entity sentiments:', error);
    return [];
  }
}

export async function getAttributeAnalysis(
  projectId: string,
  filters: SentimentFilterOptions = {}
): Promise<AttributeAnalysis[]> {
  const supabase = createClient();

  try {
    // Query brand_sentiment_attributes - entity_name is already in the table
  let query = supabase
      .from('brand_sentiment_attributes')
    .select(`
        brand_type,
        entity_name,
      positive_attributes,
      negative_attributes,
        sentiment_rating,
      analyzed_text,
      created_at,
      ai_responses!inner(platform, prompt_tracking!inner(region))
    `)
    .eq('project_id', projectId);

  // Apply filters
    if (filters.dateRange?.from && filters.dateRange?.to) {
      query = query
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());
    }

    if (filters.platform && filters.platform !== 'all') {
      query = query.eq('ai_responses.platform', filters.platform);
    }

    if (filters.region && filters.region !== 'all') {
      query = query.eq('ai_responses.prompt_tracking.region', filters.region);
    }

    if (filters.analysisType && filters.analysisType !== 'all') {
      const brandType = filters.analysisType === 'brand' ? 'client' : 'competitor';
      query = query.eq('brand_type', brandType);
    }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch attribute analysis: ${error.message}`);
  }

  // Flatten all attributes
  const attributeMap = new Map<string, {
    entityName: string;
    analysisType: 'brand' | 'competitor';
    sentimentType: 'positive' | 'neutral' | 'negative';
    occurrences: Array<{
      sentiment: number;
      text: string;
      platform: string;
      createdAt: string;
    }>;
  }>();

  (data || []).forEach((analysis: any) => {
      const entityName = analysis.entity_name || 'Unknown';
      const analysisType = analysis.brand_type === 'client' ? 'brand' : 'competitor';
      
    const processAttributes = (attributes: string[], sentimentType: 'positive' | 'neutral' | 'negative') => {
      (attributes || []).forEach((attr: string) => {
          const key = `${attr}-${entityName}-${analysisType}-${sentimentType}`;
        
        if (!attributeMap.has(key)) {
          attributeMap.set(key, {
              entityName,
              analysisType,
            sentimentType,
            occurrences: [],
          });
        }
        
        attributeMap.get(key)!.occurrences.push({
            sentiment: (analysis.sentiment_rating + 1) / 2, // Normalize to 0-1
            text: analysis.analyzed_text || '',
            platform: analysis.ai_responses?.platform || 'Unknown',
          createdAt: analysis.created_at,
        });
      });
    };

      processAttributes(analysis.positive_attributes || [], 'positive');
      processAttributes(analysis.negative_attributes || [], 'negative');
  });

  // Convert to result format
  return Array.from(attributeMap.entries())
    .map(([key, data]) => {
      const attribute = key.split('-')[0];
      const frequency = data.occurrences.length;
      const averageSentiment = data.occurrences.reduce((sum, occ) => sum + occ.sentiment, 0) / frequency;
      
      return {
        attribute,
        entityName: data.entityName,
        analysisType: data.analysisType,
        sentimentType: data.sentimentType,
        frequency,
        averageSentiment,
        examples: data.occurrences
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3),
      };
    })
    .sort((a, b) => b.frequency - a.frequency);
  } catch (error: any) {
    console.error('Error fetching attribute analysis:', error);
    return [];
  }
}

export async function triggerSentimentAnalysis(
  projectId: string,
  aiResponseId?: string,
  forceReanalysis: boolean = false
): Promise<{ success: boolean; message: string; processedCount?: number }> {
  // Note: This function is deprecated. Brand analysis is now handled by Inngest
  // (analyze-brands-batch and analyze-single-response functions)
  console.warn('triggerSentimentAnalysis is deprecated. Use Inngest brand analysis instead.');
  
    return {
      success: false,
    message: 'Sentiment analysis is now handled automatically by Inngest brand analysis system. No manual trigger needed.',
    };
}

// Helper function to get top attributes by frequency
function getTopAttributes(attributes: string[]): string[] {
  const frequencyMap = new Map<string, number>();
  
  attributes.forEach(attr => {
    frequencyMap.set(attr, (frequencyMap.get(attr) || 0) + 1);
  });
  
  return Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([attr]) => attr);
}

// Get attribute breakdown with counts and percentages
export async function getAttributeBreakdown(
  projectId: string,
  filters: SentimentFilterOptions = {}
): Promise<{
  brandAttributes: {
    positive: Array<{ attribute: string; count: number; percentage: number }>;
    neutral: Array<{ attribute: string; count: number; percentage: number }>;
    negative: Array<{ attribute: string; count: number; percentage: number }>;
  };
  competitorAttributes: {
    positive: Array<{ attribute: string; count: number; percentage: number }>;
    neutral: Array<{ attribute: string; count: number; percentage: number }>;
    negative: Array<{ attribute: string; count: number; percentage: number }>;
  };
}> {
  try {
    const supabase = createClient();

    // Query brand_sentiment_attributes
    const { data: sentimentData, error } = await supabase
      .from('brand_sentiment_attributes')
      .select('brand_type, positive_attributes, negative_attributes')
      .eq('project_id', projectId);

    if (error) {
      console.log('Brand sentiment attributes not ready for attribute breakdown:', error.message);
      return {
        brandAttributes: { positive: [], neutral: [], negative: [] },
        competitorAttributes: { positive: [], neutral: [], negative: [] },
      };
    }

    const processAttributes = (
      analyses: any[],
      type: 'positive' | 'negative'
    ) => {
      const frequencyMap = new Map<string, number>();
      const totalCount = analyses.length;

      analyses.forEach((analysis: any) => {
        const attrs = analysis[`${type}_attributes`] || [];
        attrs.forEach((attr: string) => {
          frequencyMap.set(attr, (frequencyMap.get(attr) || 0) + 1);
        });
      });

      return Array.from(frequencyMap.entries())
        .map(([attribute, count]) => ({
          attribute,
          count,
          percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    };

    const brandAnalyses = (sentimentData || []).filter((a: any) => a.brand_type === 'client');
    const competitorAnalyses = (sentimentData || []).filter((a: any) => a.brand_type === 'competitor');

    return {
      brandAttributes: {
        positive: processAttributes(brandAnalyses, 'positive') as any,
        neutral: [], // brand_sentiment_attributes doesn't have neutral_attributes
        negative: processAttributes(brandAnalyses, 'negative') as any,
      },
      competitorAttributes: {
        positive: processAttributes(competitorAnalyses, 'positive') as any,
        neutral: [], // brand_sentiment_attributes doesn't have neutral_attributes
        negative: processAttributes(competitorAnalyses, 'negative') as any,
      },
    };
  } catch (error: any) {
    console.error('Error fetching attribute breakdown:', error);
    return {
      brandAttributes: { positive: [], neutral: [], negative: [] },
      competitorAttributes: { positive: [], neutral: [], negative: [] },
    };
  }
}
