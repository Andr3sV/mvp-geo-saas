"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { differenceInDays, subDays } from "date-fns";
import { toast } from "sonner";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";
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
import { WelcomeTip } from "@/components/dashboard/welcome-tip";

export default function SentimentPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true); // For metrics and comparison
  const [isLoadingCharts, setIsLoadingCharts] = useState(true); // For charts (trends, theme frequency)
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRangeValue>(getCurrentWeekDateRange());
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

    setIsLoading(true); // For metrics and comparison
    setIsLoadingCharts(true); // For charts

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      
      // Phase 1: Load Critical Data (Metrics + Comparison)
      // Load project data, metrics, and entities in parallel
      const [
        projectDataResult,
        metricsData,
        entitiesFromEvaluations,
        totalCountResult,
        analyzedResponsesResult,
      ] = await Promise.all([
        // Project data query
        supabase
          .from('projects')
          .select('brand_name, client_url, color')
          .eq('id', selectedProjectId)
          .single(),
        // Metrics
        getSentimentMetrics(selectedProjectId, filtersPayload),
        // Entity sentiments from brand_evaluations (preferred source)
        getEntitySentimentsFromEvaluations(
          selectedProjectId,
          dateRange.from,
          dateRange.to
        ),
        // Total successful AI responses
        supabase
          .from('ai_responses')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', selectedProjectId)
          .eq('status', 'success'),
        // Analyzed responses
        supabase
          .from('brand_sentiment_attributes')
          .select('ai_response_id')
          .eq('project_id', selectedProjectId),
      ]);

      const projectData = projectDataResult.data;
      const totalCount = totalCountResult.count;
      const analyzedResponses = analyzedResponsesResult.data;

      // Set project data
      if (projectData) {
        setBrandName(projectData.brand_name || '');
        setBrandDomain(projectData.client_url || '');
        setBrandColor(projectData.color || '#3b82f6');
      }

      // Get unique response IDs (a response can have multiple sentiment analyses)
      const uniqueAnalyzedIds = new Set(
        (analyzedResponses || []).map((r: any) => r.ai_response_id)
      );
      
      setTotalResponses(totalCount || 0);
      
      // Update metrics to show correct analyzed count
      const actualAnalyzedCount = uniqueAnalyzedIds.size;
      if (metricsData) {
        metricsData.totalAnalyses = actualAnalyzedCount;
        metricsData.totalUniqueAnalyzedResponses = actualAnalyzedCount;
      }

      // Set Phase 1 data
      setMetrics(metricsData);
      setEntities(entitiesFromEvaluations || []);
      setIsLoading(false); // Comparison is ready

      // Phase 2: Load Important Data (Charts) - asynchronously
      Promise.all([
        getSentimentTrendsFromEvaluations(
          selectedProjectId,
          "brand",
          undefined,
          dateRange.from,
          dateRange.to
        ),
        getThemeFrequencyMatrix(
          selectedProjectId,
          dateRange.from,
          dateRange.to
        ),
      ])
        .then(([trendsFromEvaluations, themeFrequency]) => {
          setTrends(trendsFromEvaluations || []);
          
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
          setIsLoadingCharts(false);
        })
        .catch((error) => {
          console.error("Error loading chart data:", error);
          setIsLoadingCharts(false);
        });

    } catch (error: any) {
      console.error("Failed to load sentiment data:", error);
      toast.error("Failed to load sentiment data");
      setIsLoading(false);
      setIsLoadingCharts(false);
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

      {/* Definition Tip */}
      <WelcomeTip id="what-is-sentiment">
        <strong>💭 What is Sentiment Pulse?</strong> — Analysis of the emotional tone (positive, neutral, negative) when AI platforms talk about your brand.
      </WelcomeTip>

      {/* Welcome Tip */}
      <WelcomeTip id="sentiment">
        <span className="block mb-2">
          Understand not just how often AI mentions your brand, but <strong>how</strong> it talks about you. Sentiment analysis reveals the quality of your AI visibility.
        </span>
        <ul className="space-y-1 text-xs">
          <li><strong>📊 Sentiment Comparison</strong> — Side-by-side view of positive/neutral/negative distribution for your brand vs competitors</li>
          <li><strong>📈 Sentiment Trends</strong> — Track how sentiment scores change over time. Spot reputation improvements or emerging issues</li>
          <li><strong>🎯 Theme Frequency Radar</strong> — Discover which topics and themes are most associated with your brand in AI responses</li>
          <li><strong>📋 Themes Table</strong> — Detailed breakdown of sentiment by theme, with trend indicators and comparison to previous periods</li>
        </ul>
      </WelcomeTip>

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
          isLoading={isLoadingCharts}
        />

        {/* Theme Frequency Radar - Full Width */}
        <ThemeFrequencyRadar
          data={themeFrequencyData}
          competitors={competitors}
          brandName={brandName}
          brandDomain={brandDomain}
          brandColor={brandColor}
          isLoading={isLoadingCharts}
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
            isLoading={false}
            brandName={brandName}
            brandDomain={brandDomain}
            competitors={competitors}
          />
        )}
      </div>
    </div>
  );
}