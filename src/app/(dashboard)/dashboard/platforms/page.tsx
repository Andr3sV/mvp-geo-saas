"use client";

import { useState, useEffect, useCallback } from "react";
import { startOfWeek } from "date-fns";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { useProject } from "@/contexts/project-context";

// Components
import { PlatformCard } from "@/components/platforms/platform-card";
import { PlatformShareBar } from "@/components/platforms/platform-share-bar";
import { PlatformEvolutionChart } from "@/components/platforms/platform-evolution-chart";
import { DailyPlatformBattle } from "@/components/platforms/daily-platform-battle";
import { PlatformPerformanceHeatmap } from "@/components/platforms/platform-performance-heatmap";
import { PlatformGapAnalysis } from "@/components/platforms/platform-gap-analysis";
import { PlatformMomentum } from "@/components/platforms/platform-momentum";
import { PlatformInsights } from "@/components/platforms/platform-insights";

// Queries
import {
  getPlatformOverview,
  getPlatformEvolution,
  getPlatformEntityBreakdown,
  getPlatformMomentum,
} from "@/lib/queries/platform-breakdown";

type DateRangeValue = {
  from: Date | undefined;
  to: Date | undefined;
};

// Get yesterday's date
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  return yesterday;
}

// Default date range: current week (Monday to yesterday)
const defaultDateRange: DateRangeValue = {
  from: (() => {
    const date = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    date.setHours(0, 0, 0, 0);
    return date;
  })(),
  to: getYesterday(),
};

export default function PlatformsPage() {
  const { selectedProjectId } = useProject();
  
  // Filter state
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultDateRange);
  const [region, setRegion] = useState<string>("GLOBAL");
  const [topicId, setTopicId] = useState<string>("all");

  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<Awaited<ReturnType<typeof getPlatformOverview>> | null>(null);
  const [evolutionData, setEvolutionData] = useState<Awaited<ReturnType<typeof getPlatformEvolution>>>([]);
  const [entityBreakdown, setEntityBreakdown] = useState<Awaited<ReturnType<typeof getPlatformEntityBreakdown>> | null>(null);
  const [momentumData, setMomentumData] = useState<Awaited<ReturnType<typeof getPlatformMomentum>> | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);

    try {
      const [overview, evolution, breakdown, momentum] = await Promise.all([
        getPlatformOverview(selectedProjectId, dateRange.from, dateRange.to, region, topicId),
        getPlatformEvolution(selectedProjectId, dateRange.from, dateRange.to, region, topicId),
        getPlatformEntityBreakdown(selectedProjectId, dateRange.from, dateRange.to, region, topicId),
        getPlatformMomentum(selectedProjectId, dateRange.from, dateRange.to, region, topicId),
      ]);

      setOverviewData(overview);
      setEvolutionData(evolution);
      setEntityBreakdown(breakdown);
      setMomentumData(momentum);
    } catch (error) {
      console.error("Error loading platform data:", error);
    } finally {
      setIsLoading(false);
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
      {overviewData && (
        <PlatformShareBar platforms={overviewData.platforms} isLoading={isLoading} />
      )}

      {/* Section 3: Performance Evolution */}
      <PlatformEvolutionChart data={evolutionData} isLoading={isLoading} />

      {/* Section 4: Daily Platform Battle */}
      <DailyPlatformBattle data={evolutionData} isLoading={isLoading} />

      {/* Section 5: Platform Performance Heatmap */}
      {entityBreakdown && (
        <PlatformPerformanceHeatmap
          openaiData={entityBreakdown.openai}
          geminiData={entityBreakdown.gemini}
          isLoading={isLoading}
        />
      )}

      {/* Section 6: Platform Momentum Comparison */}
      {momentumData && (
        <PlatformMomentum
          openaiData={momentumData.openai}
          geminiData={momentumData.gemini}
          isLoading={isLoading}
        />
      )}

      {/* Section 7: Platform Gap Analysis */}
      {entityBreakdown && (
        <PlatformGapAnalysis
          openaiData={entityBreakdown.openai}
          geminiData={entityBreakdown.gemini}
          isLoading={isLoading}
        />
      )}

      {/* Section 8: Platform Insights */}
      {overviewData && (
        <PlatformInsights platforms={overviewData.platforms} isLoading={isLoading} />
      )}
    </div>
  );
}
