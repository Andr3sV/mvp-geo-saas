"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Smile,
  TrendingUp,
  Target,
  BarChart3,
} from "lucide-react";

// Sentiment Analysis Components
import { SentimentTrendsChart } from "@/components/sentiment/sentiment-trends-chart";
import { SentimentAnalysisTrigger } from "@/components/sentiment/sentiment-analysis-trigger";
import { SentimentComparison } from "@/components/sentiment/sentiment-comparison";
// New Topic-Based Components
import { TopicPerformanceMatrix } from "@/components/sentiment/topic-performance-matrix";
import { TopicSentimentTrends } from "@/components/sentiment/topic-sentiment-trends";
import { CompetitivePositioningRadar } from "@/components/sentiment/competitive-positioning-radar";
import { TopicGapAnalysis } from "@/components/sentiment/topic-gap-analysis";
import { TopPerformingTopicsScorecard } from "@/components/sentiment/top-performing-topics-scorecard";

// Queries
import {
  getSentimentMetrics,
  getSentimentTrends,
  getEntitySentiments,
  getAttributeBreakdown,
  SentimentFilterOptions,
  SentimentMetrics,
  SentimentTrend,
  EntitySentiment,
} from "@/lib/queries/sentiment-analysis";
// Brand Evaluations Queries
import {
  getTopicPerformanceMatrix,
  getTopicSentimentTrends,
  getTopicGapAnalysis,
  getSentimentDistribution,
  getTopPerformingTopics,
  getSourceQualityMetrics,
  getProjectTopics,
  getSentimentTrendsFromEvaluations,
  getEntitySentimentsFromEvaluations,
} from "@/lib/queries/brand-evaluations";

export default function SentimentPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("GLOBAL");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  
  // Topic-based evaluation data states
  const [topicMatrixData, setTopicMatrixData] = useState<any[]>([]);
  const [topicTrendsData, setTopicTrendsData] = useState<any[]>([]);
  const [gapAnalysisData, setGapAnalysisData] = useState<any[]>([]);
  const [topTopicsData, setTopTopicsData] = useState<any[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  // Data states
  const [metrics, setMetrics] = useState<SentimentMetrics | null>(null);
  const [trends, setTrends] = useState<SentimentTrend[]>([]);
  const [competitorTrends, setCompetitorTrends] = useState<SentimentTrend[]>([]);
  const [entities, setEntities] = useState<EntitySentiment[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [brandName, setBrandName] = useState("");
  const [brandDomain, setBrandDomain] = useState("");
  const [brandColor, setBrandColor] = useState<string>("#3b82f6");

  // Create filters object
  const filtersPayload: SentimentFilterOptions = {
    dateRange: dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined,
    platform: platform !== "all" ? platform : undefined,
    region: region !== "GLOBAL" ? region : undefined,
  };

  // Load sentiment data
  const loadSentimentData = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    try {
      // Get total AI responses count and analyzed count
      const supabase = (await import('@/lib/supabase/client')).createClient();
      
      // Get project details (brand name, client_url as domain, and color)
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('brand_name, client_url, color')
        .eq('id', selectedProjectId)
        .single();
      
      console.log('🏢 Project Data:', projectData, 'Error:', projectError);
      
      if (projectData) {
        setBrandName(projectData.brand_name || '');
        setBrandDomain(projectData.client_url || '');
        setBrandColor(projectData.color || '#3b82f6');
        console.log('✅ Brand set:', projectData.brand_name, projectData.client_url, projectData.color);
      }
      
      // Load available topics from brand_evaluations
      const projectTopics = await getProjectTopics(selectedProjectId);
      setAvailableTopics(projectTopics.topics || []);
      
      // Total successful AI responses
      const { count: totalCount } = await supabase
        .from('ai_responses')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', selectedProjectId)
        .eq('status', 'success');
      
      // Count unique ai_response_ids that have been analyzed (using brand_sentiment_attributes)
      const { data: analyzedResponses } = await supabase
        .from('brand_sentiment_attributes')
        .select('ai_response_id')
        .eq('project_id', selectedProjectId);
      
      // Get unique response IDs (a response can have multiple sentiment analyses)
      const uniqueAnalyzedIds = new Set(
        (analyzedResponses || []).map((r: any) => r.ai_response_id)
      );
      
      setTotalResponses(totalCount || 0);
      
      // Update metrics to show correct analyzed count
      const actualAnalyzedCount = uniqueAnalyzedIds.size;

      const [
        metricsData,
        trendsData,
        entitiesData,
        topicMatrix,
        topicTrends,
        gapAnalysis,
        topTopics,
        // Get trends from brand_evaluations instead of brand_sentiment_attributes
        trendsFromEvaluations,
        // Get entity sentiments from brand_evaluations
        entitiesFromEvaluations,
      ] = await Promise.all([
        getSentimentMetrics(selectedProjectId, filtersPayload),
        getSentimentTrends(selectedProjectId, { ...filtersPayload, analysisType: 'brand' }),
        getEntitySentiments(selectedProjectId, filtersPayload),
        // Brand evaluations queries
        getTopicPerformanceMatrix(
          selectedProjectId,
          dateRange.from,
          dateRange.to
        ),
        getTopicSentimentTrends(
          selectedProjectId,
          selectedTopic !== "all" ? selectedTopic : undefined,
          undefined,
          undefined,
          dateRange.from,
          dateRange.to
        ),
        getTopicGapAnalysis(selectedProjectId, dateRange.from, dateRange.to),
        getTopPerformingTopics(selectedProjectId, dateRange.from, dateRange.to, 10),
        // Get sentiment trends from brand_evaluations
        getSentimentTrendsFromEvaluations(
          selectedProjectId,
          "brand",
          undefined,
          dateRange.from,
          dateRange.to
        ),
        // Get entity sentiments from brand_evaluations
        getEntitySentimentsFromEvaluations(
          selectedProjectId,
          dateRange.from,
          dateRange.to
        ),
      ]);

      // Override with correct unique response count
      if (metricsData) {
        metricsData.totalAnalyses = actualAnalyzedCount;
        metricsData.totalUniqueAnalyzedResponses = actualAnalyzedCount;
      }

      console.log('📊 Sentiment Metrics:', metricsData);
      console.log('📈 Topic-Based Data Loaded');

      setMetrics(metricsData);
      // Use trends from brand_evaluations instead of brand_sentiment_attributes
      setTrends(trendsFromEvaluations || trendsData);
      // Use entity sentiments from brand_evaluations
      setEntities(entitiesFromEvaluations || entitiesData);
      
      // Set topic-based data
      setTopicMatrixData(topicMatrix || []);
      setTopicTrendsData(topicTrends || []);
      setGapAnalysisData(gapAnalysis || []);
      setTopTopicsData(topTopics || []);
    } catch (error: any) {
      console.error("Failed to load sentiment data:", error);
      toast.error("Failed to load sentiment data");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when project or filters change
  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadSentimentData();
      loadCompetitors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region, selectedTopic]);

  // Load competitors
  const loadCompetitors = async () => {
    if (!selectedProjectId) return;
    
    try {
      const { getCompetitorsByRegion } = await import("@/lib/actions/competitors");
      const result = await getCompetitorsByRegion(selectedProjectId, region);
      if (result.data) {
        const competitorsForSelector = result.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          domain: c.domain || c.name,
          color: c.color, // Include color
        }));
        setCompetitors(competitorsForSelector);
      }
    } catch (error) {
      console.error("Error loading competitors:", error);
    }
  };

  // Handle filters change
  const handleFiltersChange = (filters: {
    region: string;
    dateRange: DateRangeValue;
    platform: string;
    topicId?: string;
  }) => {
    if (filters.dateRange.from && filters.dateRange.to) {
      setDateRange(filters.dateRange);
    }
    setPlatform(filters.platform);
    setRegion(filters.region);
    if (filters.topicId !== undefined) {
      setSelectedTopic(filters.topicId);
    }
  };

  // Handle analysis completion
  const handleAnalysisComplete = () => {
    loadSentimentData();
  };

  // Load competitor trends when competitor is selected
  const loadCompetitorTrends = async (competitorId: string | null) => {
    if (!selectedProjectId || !competitorId) {
      setCompetitorTrends([]);
      return;
    }

    try {
      // Use brand_evaluations instead of brand_sentiment_attributes
      const competitorTrendsData = await getSentimentTrendsFromEvaluations(
        selectedProjectId,
        "competitor",
        competitorId,
        dateRange.from,
        dateRange.to
      );
      
      console.log('📊 Competitor Trends:', competitorTrendsData?.length, 'days for competitor', competitorId);
      setCompetitorTrends(competitorTrendsData);
    } catch (error) {
      console.error('Failed to load competitor trends:', error);
      setCompetitorTrends([]);
    }
  };

  // Handle competitor selection change
  const handleCompetitorChange = (competitorId: string | null) => {
    setSelectedCompetitorId(competitorId);
    loadCompetitorTrends(competitorId);
  };

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Sentiment Analysis"
          description="AI-powered sentiment analysis of brand and competitor mentions"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading sentiment data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sentiment Analysis"
        description="AI-powered sentiment analysis of brand and competitor mentions across platforms"
      />

      {/* Filters Toolbar with Analysis Trigger */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="flex-1">
            <FiltersToolbar
              dateRange={dateRange}
              platform={platform}
              region={region}
              topicId={selectedTopic}
              onApply={handleFiltersChange}
            />
          </div>
          <SentimentAnalysisTrigger
            projectId={selectedProjectId!}
            onAnalysisComplete={handleAnalysisComplete}
            totalResponses={totalResponses}
            analyzedResponses={metrics.totalUniqueAnalyzedResponses || 0}
          />
        </div>
        
        {/* Topic Filter for Brand Evaluations */}
        {availableTopics.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Topic (Evaluations):</label>
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {availableTopics.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Legacy Response-Based Analysis Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Response-Based Sentiment Analysis</h2>
        
        {/* Sentiment Pulse - Full Width */}
        <SentimentComparison
          entities={entities}
          isLoading={isLoading}
        />

        {/* Competitive Positioning Radar - Full Width */}
          <CompetitivePositioningRadar
            data={topicMatrixData}
            competitors={competitors}
            brandName={brandName}
            brandDomain={brandDomain}
            brandColor={brandColor}
            availableTopics={availableTopics}
            isLoading={isLoading}
          />

        {/* Sentiment Trends Chart - Full Width */}
        <SentimentTrendsChart
          trends={trends}
          competitorTrends={competitorTrends}
          entities={entities}
          competitors={competitors}
          selectedCompetitorId={selectedCompetitorId}
          onCompetitorChange={handleCompetitorChange}
          brandName={brandName}
          brandDomain={brandDomain}
          isLoading={isLoading}
        />
      </div>

      {/* Topic-Based Evaluation Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Topic-Based Sentiment Evaluation</h2>
        <p className="text-sm text-muted-foreground">
          Strategic insights from topic-based evaluations using Gemini with web search
        </p>

        {/* Top Performing Topics Scorecard */}
        <TopPerformingTopicsScorecard data={topTopicsData} isLoading={isLoading} />

        {/* Topic Performance Matrix - Full Width */}
        <TopicPerformanceMatrix data={topicMatrixData} isLoading={isLoading} />

        {/* Gap Analysis - Full Width */}
        <TopicGapAnalysis data={gapAnalysisData} isLoading={isLoading} />

        {/* Topic Sentiment Trends */}
        <TopicSentimentTrends data={topicTrendsData} isLoading={isLoading} />
      </div>
    </div>
  );
}