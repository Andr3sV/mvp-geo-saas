"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { useProject } from "@/contexts/project-context";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";

// Components
import { PlatformCard } from "@/components/platforms/platform-card";
import { PlatformShareBar } from "@/components/platforms/platform-share-bar";
import { PlatformEvolutionChart } from "@/components/platforms/platform-evolution-chart";
import { DailyPlatformBattle } from "@/components/platforms/daily-platform-battle";
import { PlatformPerformanceHeatmap } from "@/components/platforms/platform-performance-heatmap";
import { PlatformGapAnalysis } from "@/components/platforms/platform-gap-analysis";
import { PlatformMomentum } from "@/components/platforms/platform-momentum";
import { PlatformInsights } from "@/components/platforms/platform-insights";
import { WelcomeTip } from "@/components/dashboard/welcome-tip";

// Queries
import {
  getPlatformOverview,
  getPlatformEvolution,
  getPlatformEntityBreakdown,
  getPlatformMomentum,
  getPlatformBaseData,
} from "@/lib/queries/platform-breakdown";

type DateRangeValue = {
  from: Date | undefined;
  to: Date | undefined;
};

// Default date range: current week (Monday to today)
const defaultDateRange: DateRangeValue = getCurrentWeekDateRange();

export default function PlatformsPage() {
  const { selectedProjectId } = useProject();
  
  // Filter state
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultDateRange);
  const [region, setRegion] = useState<string>("GLOBAL");
  const [topicId, setTopicId] = useState<string>("all");

  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [overviewData, setOverviewData] = useState<Awaited<ReturnType<typeof getPlatformOverview>> | null>(null);
  const [evolutionData, setEvolutionData] = useState<Awaited<ReturnType<typeof getPlatformEvolution>>>([]);
  const [entityBreakdown, setEntityBreakdown] = useState<Awaited<ReturnType<typeof getPlatformEntityBreakdown>> | null>(null);
  const [momentumData, setMomentumData] = useState<Awaited<ReturnType<typeof getPlatformMomentum>> | null>(null);

  // Load data with phased loading
  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    setIsLoadingCharts(false);
    setIsLoadingAnalysis(false);

    try {
      // PHASE 1: Load Critical Data (Platform Cards + Share Bar)
      // Load base data once to avoid redundant queries
      const baseData = await getPlatformBaseData(selectedProjectId, dateRange.from, dateRange.to, region, topicId);
      
      // Load overview data using base data
      const overview = await getPlatformOverview(selectedProjectId, dateRange.from, dateRange.to, region, topicId, baseData);

      setOverviewData(overview);
      setIsLoading(false); // Cards and Share Bar are ready

      // PHASE 2: Load Important Data (Charts) - asynchronously
      setIsLoadingCharts(true);
      getPlatformEvolution(selectedProjectId, dateRange.from, dateRange.to, region, topicId, baseData)
        .then((evolution) => {
          setEvolutionData(evolution);
          setIsLoadingCharts(false);
        })
        .catch((error) => {
          console.error("Error loading evolution data:", error);
          setIsLoadingCharts(false);
        });

      // PHASE 3: Load Secondary Data (Analysis) - asynchronously
      setIsLoadingAnalysis(true);
      Promise.all([
        getPlatformEntityBreakdown(selectedProjectId, dateRange.from, dateRange.to, region, topicId, baseData),
        getPlatformMomentum(selectedProjectId, dateRange.from, dateRange.to, region, topicId, baseData),
      ])
        .then(([breakdown, momentum]) => {
          setEntityBreakdown(breakdown);
          setMomentumData(momentum);
          setIsLoadingAnalysis(false);
        })
        .catch((error) => {
          console.error("Error loading analysis data:", error);
          setIsLoadingAnalysis(false);
        });
    } catch (error) {
      console.error("Error loading platform data:", error);
      setIsLoading(false);
      setIsLoadingCharts(false);
      setIsLoadingAnalysis(false);
    }
  }, [selectedProjectId, dateRange, region, topicId]);

  // Initial load and reload on filter changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle filter changes
  const handleFilterChange = (filters: {
    region: string;
    dateRange: DateRangeValue;
    platform: string;
    topicId?: string;
    sentimentTheme?: string;
  }) => {
    setDateRange(filters.dateRange);
    setRegion(filters.region);
    if (filters.topicId !== undefined) {
      setTopicId(filters.topicId);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Platform Breakdown"
        description="Analyze your brand performance across different AI platforms"
      />

      <FiltersToolbar
        dateRange={dateRange}
        region={region}
        topicId={topicId}
        hidePlatformFilter={true}
        onApply={handleFilterChange}
      />

      {/* Definition Tip */}
      <WelcomeTip id="what-are-platforms">
        <strong>🤖 What is Platform Breakdown?</strong> — Analysis of how your brand performs on each AI platform separately (ChatGPT/OpenAI, Gemini, Perplexity, etc.).
      </WelcomeTip>

      {/* Welcome Tip */}
      <WelcomeTip id="platforms">
        <span className="block mb-2">
          Compare your brand&apos;s visibility across different AI platforms. Each platform has unique algorithms and data sources, so performance can vary significantly.
        </span>
        <ul className="space-y-1 text-xs">
          <li><strong>🎯 Platform Cards</strong> — Key metrics for each AI platform: mentions, citations, and sentiment breakdown</li>
          <li><strong>📊 Platform Share</strong> — Visual bar showing how your visibility is distributed across platforms</li>
          <li><strong>📈 Performance Evolution</strong> — Track how each platform&apos;s mention count changes over time</li>
          <li><strong>⚔️ Daily Platform Battle</strong> — Day-by-day comparison of which platform gives you more visibility</li>
          <li><strong>🔥 Performance Heatmap</strong> — See which entities (brand/competitors) perform best on each platform</li>
          <li><strong>🚀 Platform Momentum</strong> — Which platforms are accelerating or slowing down for your brand</li>
        </ul>
      </WelcomeTip>

      {/* Section 1: Platform Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {overviewData?.platforms.map((platform) => (
          <PlatformCard key={platform.id} platform={platform} isLoading={isLoading} />
        ))}
        {!overviewData && isLoading && (
          <>
            <PlatformCard platform={{} as any} isLoading={true} />
            <PlatformCard platform={{} as any} isLoading={true} />
          </>
        )}
      </div>

      {/* Section 2: Platform Share Distribution */}
      {overviewData ? (
        <PlatformShareBar platforms={overviewData.platforms} isLoading={false} />
      ) : (
        <PlatformShareBar platforms={[]} isLoading={true} />
      )}

      {/* Section 3: Performance Evolution */}
      <PlatformEvolutionChart data={evolutionData} isLoading={isLoadingCharts || !evolutionData.length} />

      {/* Section 4: Daily Platform Battle */}
      <DailyPlatformBattle data={evolutionData} isLoading={isLoadingCharts || !evolutionData.length} />

      {/* Section 5: Platform Performance Heatmap */}
      {entityBreakdown ? (
        <PlatformPerformanceHeatmap
          openaiData={entityBreakdown.openai}
          geminiData={entityBreakdown.gemini}
          isLoading={isLoadingAnalysis}
        />
      ) : (
        <PlatformPerformanceHeatmap
          openaiData={{ entities: [], totalMentions: 0 }}
          geminiData={{ entities: [], totalMentions: 0 }}
          isLoading={isLoadingAnalysis}
        />
      )}

      {/* Section 6: Platform Momentum Comparison */}
      {momentumData ? (
        <PlatformMomentum
          openaiData={momentumData.openai}
          geminiData={momentumData.gemini}
          isLoading={isLoadingAnalysis}
        />
      ) : (
        <PlatformMomentum
          openaiData={[]}
          geminiData={[]}
          isLoading={isLoadingAnalysis}
        />
      )}

      {/* Section 7: Platform Gap Analysis */}
      {entityBreakdown ? (
        <PlatformGapAnalysis
          openaiData={entityBreakdown.openai}
          geminiData={entityBreakdown.gemini}
          isLoading={isLoadingAnalysis}
        />
      ) : (
        <PlatformGapAnalysis
          openaiData={{ entities: [], totalMentions: 0 }}
          geminiData={{ entities: [], totalMentions: 0 }}
          isLoading={isLoadingAnalysis}
        />
      )}

      {/* Section 8: Platform Insights */}
      {overviewData ? (
        <PlatformInsights platforms={overviewData.platforms} isLoading={false} />
      ) : (
        <PlatformInsights platforms={[]} isLoading={true} />
      )}
    </div>
  );
}
