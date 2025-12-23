"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Hash, Globe, Ruler } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { useProject } from "@/contexts/project-context";

// Components
import { QueryWordCloud } from "@/components/queries/query-word-cloud";
import { QueryPlatformDistribution } from "@/components/queries/query-platform-distribution";
import { QueryIntentBreakdown } from "@/components/queries/query-intent-breakdown";
import { TopQueriesTable } from "@/components/queries/top-queries-table";
import { QueryDomainHeatmap } from "@/components/queries/query-domain-heatmap";

// Queries
import {
  getQueryOverview,
  getQueryWordCloudData,
  getQueryPlatformDistribution,
  getQueryIntentBreakdown,
  getTopQueries,
  getQueryDomainCorrelation,
} from "@/lib/queries/query-analytics";

type DateRangeValue = {
  from: Date | undefined;
  to: Date | undefined;
};

// Default date range: current week (Monday to today)
const defaultDateRange: DateRangeValue = getCurrentWeekDateRange();

export default function QueriesPage() {
  const { selectedProjectId } = useProject();

  // Filter state
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultDateRange);
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("GLOBAL");

  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getQueryOverview>> | null>(null);
  const [wordCloudData, setWordCloudData] = useState<Awaited<ReturnType<typeof getQueryWordCloudData>>>([]);
  const [platformDistribution, setPlatformDistribution] = useState<Awaited<ReturnType<typeof getQueryPlatformDistribution>> | null>(null);
  const [intentBreakdown, setIntentBreakdown] = useState<Awaited<ReturnType<typeof getQueryIntentBreakdown>>>([]);
  const [topQueries, setTopQueries] = useState<Awaited<ReturnType<typeof getTopQueries>>>([]);
  const [domainCorrelation, setDomainCorrelation] = useState<Awaited<ReturnType<typeof getQueryDomainCorrelation>> | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);

    try {
      const [overviewData, wordCloud, distribution, intent, queries, correlation] = await Promise.all([
        getQueryOverview(selectedProjectId, dateRange.from, dateRange.to, platform, region),
        getQueryWordCloudData(selectedProjectId, dateRange.from, dateRange.to, platform, region),
        getQueryPlatformDistribution(selectedProjectId, dateRange.from, dateRange.to, region),
        getQueryIntentBreakdown(selectedProjectId, dateRange.from, dateRange.to, platform, region),
        getTopQueries(selectedProjectId, 20, dateRange.from, dateRange.to, platform, region),
        getQueryDomainCorrelation(selectedProjectId, dateRange.from, dateRange.to, platform, region),
      ]);

      setOverview(overviewData);
      setWordCloudData(wordCloud);
      setPlatformDistribution(distribution);
      setIntentBreakdown(intent);
      setTopQueries(queries);
      setDomainCorrelation(correlation);
    } catch (error) {
      console.error("Error loading query data:", error);
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
    topicId?: string;
    sentimentTheme?: string;
  }) => {
    setDateRange(filters.dateRange);
    setPlatform(filters.platform);
    setRegion(filters.region);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Query Patterns"
        description="Discover what questions generate citations for your brand"
      />

      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        onApply={handleFilterChange}
      />

      {/* Section 1: Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Queries"
          value={overview?.totalQueries || 0}
          description="Search queries tracked"
          icon={Search}
        />
        <StatCard
          title="Unique Queries"
          value={overview?.uniqueQueries || 0}
          description="Distinct search patterns"
          icon={Hash}
        />
        <StatCard
          title="Top Platform"
          value={overview?.topPlatform || "N/A"}
          description="Most active platform"
          icon={Globe}
        />
        <StatCard
          title="Avg Query Length"
          value={`${overview?.avgQueryLength || 0} chars`}
          description="Average query size"
          icon={Ruler}
        />
      </div>

      {/* Section 2: Word Cloud */}
      <QueryWordCloud data={wordCloudData} isLoading={isLoading} />

      {/* Section 3: Platform Distribution */}
      {platformDistribution && (
        <QueryPlatformDistribution
          openaiData={platformDistribution.openai}
          geminiData={platformDistribution.gemini}
          isLoading={isLoading}
        />
      )}

      {/* Section 4: Intent Breakdown */}
      <QueryIntentBreakdown data={intentBreakdown} isLoading={isLoading} />

      {/* Section 5: Top Queries Table */}
      <TopQueriesTable data={topQueries} isLoading={isLoading} />

      {/* Section 6: Query-Domain Correlation */}
      {domainCorrelation && (
        <QueryDomainHeatmap data={domainCorrelation} isLoading={isLoading} />
      )}
    </div>
  );
}
