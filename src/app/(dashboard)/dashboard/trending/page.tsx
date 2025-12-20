"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Zap, Activity } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { useProject } from "@/contexts/project-context";

// Components
import { QueryVelocityChart } from "@/components/queries/query-velocity-chart";
import { RisingDecliningQueries } from "@/components/queries/rising-declining-queries";
import { QueryMomentumMatrix } from "@/components/queries/query-momentum-matrix";
import { EmergingQueriesTimeline } from "@/components/queries/emerging-queries-timeline";
import { TrendInsights } from "@/components/queries/trend-insights";

// Queries
import {
  getTrendMetrics,
  getQueryVelocity,
  getRisingQueries,
  getDecliningQueries,
  getQueryMomentum,
  getEmergingQueries,
} from "@/lib/queries/query-analytics";

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

// Default date range: last 30 days ending yesterday
const defaultDateRange: DateRangeValue = {
  from: (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })(),
  to: getYesterday(),
};

export default function TrendingPage() {
  const { selectedProjectId } = useProject();

  // Filter state
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultDateRange);
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("GLOBAL");

  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getTrendMetrics>> | null>(null);
  const [velocityData, setVelocityData] = useState<Awaited<ReturnType<typeof getQueryVelocity>>>([]);
  const [risingData, setRisingData] = useState<Awaited<ReturnType<typeof getRisingQueries>>>([]);
  const [decliningData, setDecliningData] = useState<Awaited<ReturnType<typeof getDecliningQueries>>>([]);
  const [momentumData, setMomentumData] = useState<Awaited<ReturnType<typeof getQueryMomentum>>>([]);
  const [emergingData, setEmergingData] = useState<Awaited<ReturnType<typeof getEmergingQueries>>>([]);

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);

    try {
      const [metricsResult, velocity, rising, declining, momentum, emerging] = await Promise.all([
        getTrendMetrics(selectedProjectId, dateRange.from, dateRange.to, platform, region),
        getQueryVelocity(selectedProjectId, dateRange.from, dateRange.to, platform, region),
        getRisingQueries(selectedProjectId, 10, dateRange.from, dateRange.to, platform, region),
        getDecliningQueries(selectedProjectId, 10, dateRange.from, dateRange.to, platform, region),
        getQueryMomentum(selectedProjectId, dateRange.from, dateRange.to, platform, region),
        getEmergingQueries(selectedProjectId, dateRange.from, dateRange.to, platform, region),
      ]);

      setMetrics(metricsResult);
      setVelocityData(velocity);
      setRisingData(rising);
      setDecliningData(declining);
      setMomentumData(momentum);
      setEmergingData(emerging);
    } catch (error) {
      console.error("Error loading trend data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, dateRange, platform, region]);

  // Initial load and reload on filter changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle filter changes
  const handleFilterChange = (filters: {
    region: string;
    dateRange: DateRangeValue;
    platform: string;
    topicId: string;
  }) => {
    setDateRange(filters.dateRange);
    setPlatform(filters.platform);
    setRegion(filters.region);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trending Queries"
        description="Stay ahead with real-time query trends and emerging topics"
      />

      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        onApply={handleFilterChange}
      />

      {/* Section 1: Trend Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Rising Queries"
          value={metrics?.risingCount || 0}
          description="Increasing in volume"
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          title="Declining Queries"
          value={metrics?.decliningCount || 0}
          description="Decreasing in volume"
          icon={TrendingDown}
          isLoading={isLoading}
        />
        <StatCard
          title="New Queries"
          value={metrics?.newCount || 0}
          description="Just appeared"
          icon={Zap}
          isLoading={isLoading}
        />
        <StatCard
          title="Momentum Score"
          value={`${(metrics?.momentumScore || 0) > 0 ? "+" : ""}${metrics?.momentumScore || 0}%`}
          description="Overall trend"
          icon={Activity}
          trend={metrics ? { value: Math.abs(metrics.momentumScore), isPositive: metrics.momentumScore > 0 } : undefined}
          isLoading={isLoading}
        />
      </div>

      {/* Section 2: Query Velocity Chart */}
      <QueryVelocityChart data={velocityData} isLoading={isLoading} />

      {/* Section 3: Rising vs Declining Queries */}
      <RisingDecliningQueries
        risingData={risingData}
        decliningData={decliningData}
        isLoading={isLoading}
      />

      {/* Section 4: Query Momentum Matrix */}
      <QueryMomentumMatrix data={momentumData} isLoading={isLoading} />

      {/* Section 5: Emerging Queries Timeline */}
      <EmergingQueriesTimeline data={emergingData} isLoading={isLoading} />

      {/* Section 6: Trend Insights */}
      {metrics && (
        <TrendInsights
          metrics={metrics}
          topRising={risingData.slice(0, 3)}
          topDeclining={decliningData.slice(0, 3)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
