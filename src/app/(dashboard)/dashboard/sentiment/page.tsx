"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subDays } from "date-fns";
import { toast } from "sonner";
import {
  Smile,
  TrendingUp,
  Target,
  BarChart3,
} from "lucide-react";

// Sentiment Analysis Components
import { SentimentMetricCard } from "@/components/sentiment/sentiment-metric-card";
import { SentimentTrendsChart } from "@/components/sentiment/sentiment-trends-chart";
import { EntitySentimentTable } from "@/components/sentiment/entity-sentiment-table";
import { SentimentAnalysisTrigger } from "@/components/sentiment/sentiment-analysis-trigger";
import { AttributeBreakdown } from "@/components/sentiment/attribute-breakdown";
import { SentimentComparison } from "@/components/sentiment/sentiment-comparison";

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
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);

  // Data states
  const [metrics, setMetrics] = useState<SentimentMetrics | null>(null);
  const [trends, setTrends] = useState<SentimentTrend[]>([]);
  const [competitorTrends, setCompetitorTrends] = useState<SentimentTrend[]>([]);
  const [entities, setEntities] = useState<EntitySentiment[]>([]);
  const [attributes, setAttributes] = useState<any>(null);
  const [totalResponses, setTotalResponses] = useState(0);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [brandName, setBrandName] = useState("");
  const [brandDomain, setBrandDomain] = useState("");

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
      
      // Get project details (brand name and domain)
      const { data: projectData } = await supabase
        .from('projects')
        .select('brand_name, brand_domain')
        .eq('id', selectedProjectId)
        .single();
      
      if (projectData) {
        setBrandName(projectData.brand_name || '');
        setBrandDomain(projectData.brand_domain || '');
      }
      
      // Total successful AI responses
      const { count: totalCount } = await supabase
        .from('ai_responses')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', selectedProjectId)
        .eq('status', 'success');
      
      // Count unique ai_response_ids that have been analyzed
      const { data: analyzedResponses } = await supabase
        .from('sentiment_analysis')
        .select('ai_response_id')
        .eq('project_id', selectedProjectId);
      
      // Get unique response IDs (a response can have multiple sentiment analyses)
      const uniqueAnalyzedIds = new Set(
        (analyzedResponses || []).map((r: any) => r.ai_response_id)
      );
      
      setTotalResponses(totalCount || 0);
      
      // Update metrics to show correct analyzed count
      const actualAnalyzedCount = uniqueAnalyzedIds.size;

      const [metricsData, trendsData, entitiesData, attributesData] = await Promise.all([
        getSentimentMetrics(selectedProjectId, filtersPayload),
        getSentimentTrends(selectedProjectId, { ...filtersPayload, analysisType: 'brand' }),
        getEntitySentiments(selectedProjectId, filtersPayload),
        getAttributeBreakdown(selectedProjectId, filtersPayload),
      ]);

      // Override with correct unique response count
      if (metricsData) {
        metricsData.totalAnalyses = actualAnalyzedCount;
        metricsData.totalUniqueAnalyzedResponses = actualAnalyzedCount;
      }

      console.log('📊 Sentiment Metrics:', metricsData);
      console.log('📈 Trends:', trendsData?.length, 'days');
      console.log('👥 Entities:', entitiesData?.length);
      console.log('🏷️ Attributes:', attributesData);

      setMetrics(metricsData);
      setTrends(trendsData);
      setEntities(entitiesData);
      setAttributes(attributesData);
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
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region]);

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
  }) => {
    if (filters.dateRange.from && filters.dateRange.to) {
      setDateRange(filters.dateRange);
    }
    setPlatform(filters.platform);
    setRegion(filters.region);
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
      const competitorTrendsData = await getSentimentTrends(selectedProjectId, {
        ...filtersPayload,
        competitorId: competitorId,
        analysisType: 'competitor',
      });
      
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
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        <div className="flex-1">
          <FiltersToolbar
            dateRange={dateRange}
            platform={platform}
            region={region}
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

      {/* Sentiment Pulse and Key Attributes - Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SentimentComparison
          entities={entities}
          isLoading={isLoading}
        />
        <AttributeBreakdown
          brandAttributes={attributes?.brandAttributes || []}
          competitorAttributes={attributes?.competitorAttributes || []}
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

      {/* Tabs for detailed insights */}
      <Tabs defaultValue="entities" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entities">Entity Analysis</TabsTrigger>
          <TabsTrigger value="attributes">Attribute Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="entities" className="mt-6">
          <EntitySentimentTable
            entities={entities}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="attributes" className="mt-6">
          <AttributeBreakdown
            brandAttributes={attributes?.brandAttributes || []}
            competitorAttributes={attributes?.competitorAttributes || []}
            isLoading={isLoading}
            detailed={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}