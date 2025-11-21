"use client";

import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/contexts/project-context";
import { toast } from "sonner";

// Sentiment Analysis Components
import { SentimentOverviewCards } from "@/components/sentiment/sentiment-overview-cards";
import { SentimentTrendsChart } from "@/components/sentiment/sentiment-trends-chart";
import { EntitySentimentTable } from "@/components/sentiment/entity-sentiment-table";
import { SentimentAnalysisTrigger } from "@/components/sentiment/sentiment-analysis-trigger";

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

export default function SentimentPage() {
  const { selectedProjectId } = useProject();
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");

  // Data states
  const [metrics, setMetrics] = useState<SentimentMetrics | null>(null);
  const [trends, setTrends] = useState<SentimentTrend[]>([]);
  const [entities, setEntities] = useState<EntitySentiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalResponses, setTotalResponses] = useState(0);

  // Create filters object
  const filtersPayload: SentimentFilterOptions = {
    dateRange: dateRange ? { from: dateRange.from!, to: dateRange.to! } : undefined,
    platform: platform !== "all" ? platform : undefined,
    region: region !== "all" ? region : undefined,
  };

  // Load sentiment data
  const loadSentimentData = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    try {
      // Get total AI responses count
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { count } = await supabase
        .from('ai_responses')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', selectedProjectId)
        .eq('status', 'success');
      
      setTotalResponses(count || 0);

      const [metricsData, trendsData, entitiesData] = await Promise.all([
        getSentimentMetrics(selectedProjectId, filtersPayload),
        getSentimentTrends(selectedProjectId, filtersPayload),
        getEntitySentiments(selectedProjectId, filtersPayload),
      ]);

      setMetrics(metricsData);
      setTrends(trendsData);
      setEntities(entitiesData);
    } catch (error: any) {
      console.error("Failed to load sentiment data:", error);
      toast.error("Failed to load sentiment data");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when project or filters change
  useEffect(() => {
    loadSentimentData();
  }, [selectedProjectId, dateRange, platform, region]);

  // Handle analysis completion
  const handleAnalysisComplete = () => {
    loadSentimentData();
  };

  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium">No Project Selected</h3>
          <p className="text-muted-foreground">Please select a project to view sentiment analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sentiment Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered sentiment analysis of brand and competitor mentions
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Filter sentiment data by date range, platform, and region
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                  <SelectItem value="chatgpt">ChatGPT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Region</label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="ES">Spain</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="IT">Italy</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="BR">Brazil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Trigger */}
      <SentimentAnalysisTrigger
        projectId={selectedProjectId}
        onAnalysisComplete={handleAnalysisComplete}
        totalResponses={totalResponses}
        analyzedResponses={metrics?.totalAnalyses || 0}
      />

      {/* Overview Cards */}
      {metrics && (
        <SentimentOverviewCards
          metrics={metrics}
          isLoading={isLoading}
        />
      )}

      {/* Sentiment Trends Chart */}
      <SentimentTrendsChart
        trends={trends}
        isLoading={isLoading}
      />

      {/* Entity Sentiment Analysis */}
      <EntitySentimentTable
        entities={entities}
        isLoading={isLoading}
      />
    </div>
  );
}