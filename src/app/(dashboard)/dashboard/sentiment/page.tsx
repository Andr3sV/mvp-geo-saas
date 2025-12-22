"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { subDays, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Sentiment Analysis Components
import { SentimentTrendsChart } from "@/components/sentiment/sentiment-trends-chart";
import { SentimentComparison } from "@/components/sentiment/sentiment-comparison";
import { ThemeFrequencyRadar } from "@/components/sentiment/theme-frequency-radar";
import { ThemesTable } from "@/components/sentiment/themes-table";

// Queries
import {
  getSentimentMetrics,
  getSentimentTrends,
  getEntitySentiments,
  SentimentFilterOptions,
  SentimentMetrics,
  SentimentTrend,
  EntitySentiment,
} from "@/lib/queries/sentiment-analysis";
// Brand Evaluations Queries
import {
  getSentimentTrendsFromEvaluations,
  getEntitySentimentsFromEvaluations,
  getThemeFrequencyMatrix,
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
  
  // Theme frequency data state
  const [themeFrequencyData, setThemeFrequencyData] = useState<any[]>([]);

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
        // Get trends from brand_evaluations instead of brand_sentiment_attributes
        trendsFromEvaluations,
        // Get entity sentiments from brand_evaluations
        entitiesFromEvaluations,
        // Get theme frequency matrix
        themeFrequency,
      ] = await Promise.all([
        getSentimentMetrics(selectedProjectId, filtersPayload),
        getSentimentTrends(selectedProjectId, { ...filtersPayload, analysisType: 'brand' }),
        getEntitySentiments(selectedProjectId, filtersPayload),
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
        // Get theme frequency matrix
        getThemeFrequencyMatrix(
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
      console.log('📈 Category-Based Data Loaded');

      setMetrics(metricsData);
      // Use trends from brand_evaluations instead of brand_sentiment_attributes
      setTrends(trendsFromEvaluations || trendsData);
      // Use entity sentiments from brand_evaluations
      setEntities(entitiesFromEvaluations || entitiesData);
      
      // Validate and log theme frequency data
      console.log('[SentimentPage] Theme frequency data:', {
        count: themeFrequency?.length || 0,
        sample: themeFrequency?.slice(0, 3),
        hasData: (themeFrequency || []).length > 0
      });
      
      if (!themeFrequency || themeFrequency.length === 0) {
        console.warn('[SentimentPage] No theme frequency data returned. Possible reasons:');
        console.warn('  - No themes in sentiment_themes table for this project');
        console.warn('  - No evaluations with positive_theme_ids or negative_theme_ids');
        console.warn('  - Theme IDs in evaluations do not match IDs in sentiment_themes');
      }
      
      setThemeFrequencyData(themeFrequency || []);
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
    sentimentTheme?: string;
  }) => {
    if (filters.dateRange.from && filters.dateRange.to) {
      setDateRange(filters.dateRange);
    }
    setPlatform(filters.platform);
    setRegion(filters.region);
    if (filters.sentimentTheme !== undefined) {
      setSelectedTopic(filters.sentimentTheme);
    }
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
          title="Sentiment Pulse"
          description="Analysis of positive and negative mentions about the brand and competitors"
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
        title="Sentiment Pulse"
        description="Analysis of positive and negative mentions about the brand and competitors"
      />

      {/* Filters Toolbar */}
      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        sentimentTheme={selectedTopic}
        hideTopicFilter={true}
        showSentimentThemeFilter={true}
        onApply={handleFiltersChange}
      />

      {/* Sentiment Analysis Section */}
      <div className="space-y-6">
        {/* Sentiment Pulse */}
        <div>
          <SentimentComparison
            entities={entities}
            isLoading={isLoading}
          />
        </div>

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

        {/* Theme Frequency Radar - Full Width */}
        <ThemeFrequencyRadar
          data={themeFrequencyData}
          competitors={competitors}
          brandName={brandName}
          brandDomain={brandDomain}
          brandColor={brandColor}
          isLoading={isLoading}
        />

        {/* Themes Table */}
        {dateRange.from && dateRange.to && (
          <ThemesTable
            projectId={selectedProjectId || ""}
            dateRange={{ from: dateRange.from, to: dateRange.to }}
            previousDateRange={
              (() => {
                const daysDiff = differenceInDays(dateRange.to, dateRange.from);
                return {
                  from: subDays(dateRange.from, daysDiff + 1),
                  to: subDays(dateRange.from, 1),
                };
              })()
            }
            isLoading={isLoading}
            brandName={brandName}
            brandDomain={brandDomain}
            competitors={competitors}
          />
        )}
      </div>
    </div>
  );
}