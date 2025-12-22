"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target } from "lucide-react";

// Attribute Components
import { SentimentScoreThermometer } from "@/components/sentiment/sentiment-score-thermometer";
import { CompetitivePositioningRadar } from "@/components/sentiment/competitive-positioning-radar";
import { TopicPerformanceMatrix } from "@/components/sentiment/topic-performance-matrix";
import { TopicSentimentTrends } from "@/components/sentiment/topic-sentiment-trends";

// Queries
import {
  getProjectTopics,
  getTopicPerformanceMatrix,
  getTopicSentimentTrends,
  getTopPerformingTopics,
  getEntitySentimentsFromEvaluations,
} from "@/lib/queries/brand-evaluations";
import { EntitySentiment } from "@/lib/queries/sentiment-analysis";

export default function AttributesPage() {
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

  // Data states
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  
  // Component data states (moved from Sentiment page)
  const [topicMatrixData, setTopicMatrixData] = useState<any[]>([]);
  const [topicTrendsData, setTopicTrendsData] = useState<any[]>([]);
  const [topTopicsData, setTopTopicsData] = useState<any[]>([]);
  const [entities, setEntities] = useState<EntitySentiment[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [brandName, setBrandName] = useState("");
  const [brandDomain, setBrandDomain] = useState("");
  const [brandColor, setBrandColor] = useState<string>("#3b82f6");

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
          color: c.color,
        }));
        setCompetitors(competitorsForSelector);
      }
    } catch (error) {
      console.error("Error loading competitors:", error);
    }
  };

  // Load attributes data
  const loadAttributesData = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    try {
      // Get project details (brand name, client_url as domain, and color)
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data: projectData } = await supabase
        .from('projects')
        .select('brand_name, client_url, color')
        .eq('id', selectedProjectId)
        .single();
      
      if (projectData) {
        setBrandName(projectData.brand_name || '');
        setBrandDomain(projectData.client_url || '');
        setBrandColor(projectData.color || '#3b82f6');
      }

      // Load available topics
      const projectTopics = await getProjectTopics(selectedProjectId);
      setAvailableTopics(projectTopics.topics || []);

      const [
        topicMatrix,
        topicTrends,
        topTopics,
        entitiesFromEvaluations,
      ] = await Promise.all([
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
        getTopPerformingTopics(selectedProjectId, dateRange.from, dateRange.to, 10),
        getEntitySentimentsFromEvaluations(
          selectedProjectId,
          dateRange.from,
          dateRange.to
        ),
      ]);
      
      // Set component data
      setTopicMatrixData(topicMatrix || []);
      setTopicTrendsData(topicTrends || []);
      setTopTopicsData(topTopics || []);
      setEntities(entitiesFromEvaluations || []);
    } catch (error: any) {
      console.error("Failed to load attributes data:", error);
      toast.error("Failed to load attributes data");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when project or filters change
  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadAttributesData();
      loadCompetitors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region, selectedTopic]);

  // Handle filters change
  const handleFiltersChange = (filters: {
    region: string;
    dateRange: DateRangeValue;
    platform: string;
    topicId?: string;
    sentimentTheme?: string;
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Sentiment Scoring"
          description="Sentiment scoring analysis across different topics related to the brand and competitors"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading attributes data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sentiment Scoring"
        description="Sentiment scoring analysis across different topics related to the brand and competitors"
      />

      {/* Filters Toolbar */}
      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        topicId={selectedTopic}
        hidePlatformFilter={true}
        hideTopicFilter={true}
        onApply={handleFiltersChange}
      />

      {/* Sentiment Score, Best Sentiment Score, and Competitive Advantage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Score - Left side */}
        <div>
          <SentimentScoreThermometer
            entities={entities}
            isLoading={isLoading}
          />
        </div>

        {/* Best Sentiment Score and Competitive Advantage - Right side, vertical stack */}
        <div className="space-y-6">
          {/* Best Sentiment Score */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Best Sentiment Score</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topTopicsData
                  .sort((a, b) => b.avg_sentiment_score - a.avg_sentiment_score)
                  .slice(0, 5)
                  .map((item, idx) => (
                    <div key={item.topic} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground w-6">
                          #{idx + 1}
                        </span>
                        <span className="text-sm truncate" title={item.topic}>
                          {item.topic}
                        </span>
                      </div>
                      <span className="text-sm font-semibold ml-2">
                        {item.avg_sentiment_score.toFixed(2)}
                      </span>
                    </div>
                  ))}
                {topTopicsData.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Competitive Advantage */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Competitive Advantage</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topTopicsData
                  .sort((a, b) => b.competitive_advantage - a.competitive_advantage)
                  .slice(0, 5)
                  .map((item, idx) => (
                    <div key={item.topic} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground w-6">
                          #{idx + 1}
                        </span>
                        <span className="text-sm truncate" title={item.topic}>
                          {item.topic}
                        </span>
                      </div>
                      <span className="text-sm font-semibold ml-2">
                        {item.competitive_advantage > 0 ? "+" : ""}
                        {item.competitive_advantage.toFixed(2)}
                      </span>
                    </div>
                  ))}
                {topTopicsData.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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

      {/* Sentiment Topics Performance Matrix - Full Width */}
      <TopicPerformanceMatrix 
        data={topicMatrixData} 
        isLoading={isLoading}
        brandDomain={brandDomain}
        competitors={competitors}
      />

      {/* Topic Sentiment Trends - Full Width */}
      <TopicSentimentTrends data={topicTrendsData} isLoading={isLoading} />
    </div>
  );
}
