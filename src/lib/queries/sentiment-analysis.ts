import { createClient } from '@/lib/supabase/server';

export interface SentimentFilterOptions {
  dateRange?: {
    from: Date;
    to: Date;
  };
  platform?: string;
  region?: string;
  analysisType?: 'brand' | 'competitor' | 'all';
  sentimentLabel?: 'positive' | 'neutral' | 'negative' | 'all';
}

export interface SentimentMetrics {
  totalAnalyses: number;
  brandAnalyses: number;
  competitorAnalyses: number;
  averageSentiment: number;
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

// Helper functions for applying filters
function applyDateFilter(query: any, filters: SentimentFilterOptions) {
  if (filters.dateRange?.from && filters.dateRange?.to) {
    return query
      .gte('sentiment_analysis.created_at', filters.dateRange.from.toISOString())
      .lte('sentiment_analysis.created_at', filters.dateRange.to.toISOString());
  }
  return query;
}

function applyPlatformFilter(query: any, filters: SentimentFilterOptions) {
  if (filters.platform && filters.platform !== 'all') {
    return query.eq('ai_responses.platform', filters.platform);
  }
  return query;
}

function applyRegionFilter(query: any, filters: SentimentFilterOptions) {
  if (filters.region && filters.region !== 'all') {
    return query.eq('prompt_tracking.region', filters.region);
  }
  return query;
}

function applyAnalysisTypeFilter(query: any, filters: SentimentFilterOptions) {
  if (filters.analysisType && filters.analysisType !== 'all') {
    return query.eq('sentiment_analysis.analysis_type', filters.analysisType);
  }
  return query;
}

function applySentimentFilter(query: any, filters: SentimentFilterOptions) {
  if (filters.sentimentLabel && filters.sentimentLabel !== 'all') {
    return query.eq('sentiment_analysis.sentiment_label', filters.sentimentLabel);
  }
  return query;
}

export async function getSentimentMetrics(
  projectId: string,
  filters: SentimentFilterOptions = {}
): Promise<SentimentMetrics> {
  const supabase = await createClient();

  // Base query with joins
  let query = supabase
    .from('sentiment_analysis')
    .select(`
      analysis_type,
      overall_sentiment,
      sentiment_label,
      confidence_score,
      ai_responses!inner(platform, prompt_tracking!inner(region))
    `)
    .eq('project_id', projectId);

  // Apply filters
  query = applySentimentFilter(
    applyAnalysisTypeFilter(
      applyRegionFilter(
        applyPlatformFilter(
          applyDateFilter(query, filters),
          filters
        ),
        filters
      ),
      filters
    ),
    filters
  );

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sentiment metrics: ${error.message}`);
  }

  const analyses = data || [];
  const totalAnalyses = analyses.length;
  const brandAnalyses = analyses.filter((a: any) => a.analysis_type === 'brand').length;
  const competitorAnalyses = analyses.filter((a: any) => a.analysis_type === 'competitor').length;

  const averageSentiment = totalAnalyses > 0 
    ? analyses.reduce((sum: number, a: any) => sum + a.overall_sentiment, 0) / totalAnalyses 
    : 0;

  const confidenceScore = totalAnalyses > 0
    ? analyses.reduce((sum: number, a: any) => sum + a.confidence_score, 0) / totalAnalyses
    : 0;

  const sentimentDistribution = {
    positive: analyses.filter((a: any) => a.sentiment_label === 'positive').length,
    neutral: analyses.filter((a: any) => a.sentiment_label === 'neutral').length,
    negative: analyses.filter((a: any) => a.sentiment_label === 'negative').length,
  };

  return {
    totalAnalyses,
    brandAnalyses,
    competitorAnalyses,
    averageSentiment,
    sentimentDistribution,
    confidenceScore,
  };
}

export async function getSentimentTrends(
  projectId: string,
  filters: SentimentFilterOptions = {}
): Promise<SentimentTrend[]> {
  const supabase = await createClient();

  // Get date range (default to last 30 days if not specified)
  const endDate = filters.dateRange?.to || new Date();
  const startDate = filters.dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let query = supabase
    .from('sentiment_analysis')
    .select(`
      created_at,
      overall_sentiment,
      sentiment_label,
      ai_responses!inner(platform, prompt_tracking!inner(region))
    `)
    .eq('project_id', projectId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  // Apply filters
  query = applySentimentFilter(
    applyAnalysisTypeFilter(
      applyRegionFilter(
        applyPlatformFilter(query, filters),
        filters
      ),
      filters
    ),
    filters
  );

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sentiment trends: ${error.message}`);
  }

  // Group by date and calculate metrics
  const trendMap = new Map<string, {
    positive: number;
    neutral: number;
    negative: number;
    totalAnalyses: number;
    sentimentSum: number;
  }>();

  (data || []).forEach((analysis: any) => {
    const date = new Date(analysis.created_at).toISOString().split('T')[0];
    const existing = trendMap.get(date) || {
      positive: 0,
      neutral: 0,
      negative: 0,
      totalAnalyses: 0,
      sentimentSum: 0,
    };

    existing[analysis.sentiment_label as keyof typeof existing]++;
    existing.totalAnalyses++;
    existing.sentimentSum += analysis.overall_sentiment;

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
      averageSentiment: metrics.totalAnalyses > 0 ? metrics.sentimentSum / metrics.totalAnalyses : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getEntitySentiments(
  projectId: string,
  filters: SentimentFilterOptions = {}
): Promise<EntitySentiment[]> {
  const supabase = await createClient();

  let query = supabase
    .from('sentiment_analysis')
    .select(`
      *,
      ai_responses!inner(platform, prompt_tracking!inner(region))
    `)
    .eq('project_id', projectId);

  // Apply filters
  query = applySentimentFilter(
    applyAnalysisTypeFilter(
      applyRegionFilter(
        applyPlatformFilter(
          applyDateFilter(query, filters),
          filters
        ),
        filters
      ),
      filters
    ),
    filters
  );

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch entity sentiments: ${error.message}`);
  }

  // Group by entity
  const entityMap = new Map<string, any[]>();

  (data || []).forEach((analysis: any) => {
    const key = `${analysis.entity_name}-${analysis.analysis_type}`;
    if (!entityMap.has(key)) {
      entityMap.set(key, []);
    }
    entityMap.get(key)!.push(analysis);
  });

  // Process each entity
  return Array.from(entityMap.entries()).map(([key, analyses]) => {
    const firstAnalysis = analyses[0];
    const totalMentions = analyses.length;
    
    const averageSentiment = analyses.reduce((sum, a) => sum + a.overall_sentiment, 0) / totalMentions;
    const confidenceScore = analyses.reduce((sum, a) => sum + a.confidence_score, 0) / totalMentions;
    
    const positiveCount = analyses.filter(a => a.sentiment_label === 'positive').length;
    const neutralCount = analyses.filter(a => a.sentiment_label === 'neutral').length;
    const negativeCount = analyses.filter(a => a.sentiment_label === 'negative').length;
    
    // Determine overall sentiment label
    let sentimentLabel: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (averageSentiment >= 0.6) sentimentLabel = 'positive';
    else if (averageSentiment <= 0.4) sentimentLabel = 'negative';
    
    // Extract top attributes
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
        analyzedText: a.analyzed_text,
        overallSentiment: a.overall_sentiment,
        sentimentLabel: a.sentiment_label,
        aiReasoning: a.ai_reasoning,
        createdAt: a.created_at,
        platform: a.ai_responses.platform,
      }));

    return {
      entityName: firstAnalysis.entity_name,
      entityDomain: firstAnalysis.entity_domain,
      analysisType: firstAnalysis.analysis_type,
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
}

export async function getAttributeAnalysis(
  projectId: string,
  filters: SentimentFilterOptions = {}
): Promise<AttributeAnalysis[]> {
  const supabase = await createClient();

  let query = supabase
    .from('sentiment_analysis')
    .select(`
      entity_name,
      analysis_type,
      positive_attributes,
      neutral_attributes,
      negative_attributes,
      overall_sentiment,
      analyzed_text,
      created_at,
      ai_responses!inner(platform, prompt_tracking!inner(region))
    `)
    .eq('project_id', projectId);

  // Apply filters
  query = applySentimentFilter(
    applyAnalysisTypeFilter(
      applyRegionFilter(
        applyPlatformFilter(
          applyDateFilter(query, filters),
          filters
        ),
        filters
      ),
      filters
    ),
    filters
  );

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
    const processAttributes = (attributes: string[], sentimentType: 'positive' | 'neutral' | 'negative') => {
      (attributes || []).forEach((attr: string) => {
        const key = `${attr}-${analysis.entity_name}-${analysis.analysis_type}-${sentimentType}`;
        
        if (!attributeMap.has(key)) {
          attributeMap.set(key, {
            entityName: analysis.entity_name,
            analysisType: analysis.analysis_type,
            sentimentType,
            occurrences: [],
          });
        }
        
        attributeMap.get(key)!.occurrences.push({
          sentiment: analysis.overall_sentiment,
          text: analysis.analyzed_text,
          platform: analysis.ai_responses.platform,
          createdAt: analysis.created_at,
        });
      });
    };

    processAttributes(analysis.positive_attributes, 'positive');
    processAttributes(analysis.neutral_attributes, 'neutral');
    processAttributes(analysis.negative_attributes, 'negative');
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
}

export async function triggerSentimentAnalysis(
  projectId: string,
  aiResponseId?: string,
  forceReanalysis: boolean = false
): Promise<{ success: boolean; message: string; processedCount?: number }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.functions.invoke('analyze-sentiment', {
      body: {
        project_id: projectId,
        ai_response_id: aiResponseId,
        force_reanalysis: forceReanalysis,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: data.message || 'Sentiment analysis completed successfully',
      processedCount: data.processed_count,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to trigger sentiment analysis',
    };
  }
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
