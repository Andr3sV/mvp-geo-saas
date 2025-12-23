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
import { TopQueriesTable } from "@/components/queries/top-queries-table";
import { QueryDomainHeatmap } from "@/components/queries/query-domain-heatmap";

// Queries
import {
  getQueryOverview,
  getQueryWordCloudData,
  getQueryPlatformDistribution,
  getTopQueries,
  getQueryDomainCorrelation,
} from "@/lib/queries/query-analytics";
import { type EntityFilterValue } from "@/components/dashboard/entity-filter-select";

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
  const [selectedEntities, setSelectedEntities] = useState<EntityFilterValue>([
    { id: null, type: "brand" },
  ]);

  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getQueryOverview>> | null>(null);
  const [wordCloudData, setWordCloudData] = useState<Awaited<ReturnType<typeof getQueryWordCloudData>>>([]);
  const [platformDistribution, setPlatformDistribution] = useState<Awaited<ReturnType<typeof getQueryPlatformDistribution>> | null>(null);
  const [topQueries, setTopQueries] = useState<Awaited<ReturnType<typeof getTopQueries>>>([]);
  const [domainCorrelation, setDomainCorrelation] = useState<Awaited<ReturnType<typeof getQueryDomainCorrelation>> | null>(null);

  // Helper functions to merge results from multiple entities
  const mergeWordCloudData = (results: Array<{ text: string; value: number }>[]): Array<{ text: string; value: number }> => {
    const merged = new Map<string, number>();
    results.forEach((result) => {
      result.forEach((item) => {
        merged.set(item.text, (merged.get(item.text) || 0) + item.value);
      });
    });
    return Array.from(merged.entries())
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value);
  };

  const mergePlatformDistribution = (results: Array<{ openai: Array<{ query: string; count: number }>; gemini: Array<{ query: string; count: number }> }>): { openai: Array<{ query: string; count: number }>; gemini: Array<{ query: string; count: number }> } => {
    const openaiMap = new Map<string, number>();
    const geminiMap = new Map<string, number>();

    results.forEach((result) => {
      result.openai.forEach((item) => {
        openaiMap.set(item.query, (openaiMap.get(item.query) || 0) + item.count);
      });
      result.gemini.forEach((item) => {
        geminiMap.set(item.query, (geminiMap.get(item.query) || 0) + item.count);
      });
    });

    const openai = Array.from(openaiMap.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const gemini = Array.from(geminiMap.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { openai, gemini };
  };


  const mergeTopQueries = (results: Array<{ query: string; count: number; platforms: string[]; domains: string[] }>[]): Array<{ query: string; count: number; platforms: string[]; domains: string[] }> => {
    const merged = new Map<string, { count: number; platforms: Set<string>; domains: Set<string> }>();
    results.forEach((result) => {
      result.forEach((item) => {
        const existing = merged.get(item.query);
        if (existing) {
          existing.count += item.count;
          item.platforms.forEach((p) => existing.platforms.add(p));
          item.domains.forEach((d) => existing.domains.add(d));
        } else {
          merged.set(item.query, {
            count: item.count,
            platforms: new Set(item.platforms),
            domains: new Set(item.domains),
          });
        }
      });
    });
    return Array.from(merged.entries())
      .map(([query, { count, platforms, domains }]) => ({
        query,
        count,
        platforms: Array.from(platforms),
        domains: Array.from(domains).slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const mergeQueryOverview = (results: { totalQueries: number; uniqueQueries: number; topPlatform: string; avgQueryLength: number }[]): { totalQueries: number; uniqueQueries: number; topPlatform: string; avgQueryLength: number } => {
    const totalQueries = results.reduce((sum, r) => sum + r.totalQueries, 0);
    // For unique queries, we sum them as an approximation (actual unique count would require storing all query strings)
    const uniqueQueries = results.reduce((sum, r) => sum + r.uniqueQueries, 0);
    let totalLength = 0;
    let totalCount = 0;
    const platformCounts = new Map<string, number>();

    // Calculate averages and platform counts
    results.forEach((r) => {
      totalLength += r.avgQueryLength * r.totalQueries;
      totalCount += r.totalQueries;
      if (r.topPlatform && r.topPlatform !== "N/A") {
        platformCounts.set(r.topPlatform, (platformCounts.get(r.topPlatform) || 0) + r.totalQueries);
      }
    });

    const avgQueryLength = totalCount > 0 ? Math.round(totalLength / totalCount) : 0;
    const topPlatform = Array.from(platformCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return {
      totalQueries,
      uniqueQueries, // Approximate: sum of unique queries from each entity
      topPlatform,
      avgQueryLength,
    };
  };

  const mergeQueryDomainCorrelation = (results: { queries: string[]; domains: string[]; matrix: number[][] }[]): { queries: string[]; domains: string[]; matrix: number[][] } => {
    const allQueries = new Set<string>();
    const allDomains = new Set<string>();

    results.forEach((result) => {
      result.queries.forEach((q) => allQueries.add(q));
      result.domains.forEach((d) => allDomains.add(d));
    });

    const queries = Array.from(allQueries);
    const domains = Array.from(allDomains);

    // Build correlation map
    const correlationMap = new Map<string, Map<string, number>>();
    results.forEach((result) => {
      result.queries.forEach((query, qIdx) => {
        result.domains.forEach((domain, dIdx) => {
          const count = result.matrix[qIdx]?.[dIdx] || 0;
          if (!correlationMap.has(query)) {
            correlationMap.set(query, new Map());
          }
          const queryMap = correlationMap.get(query)!;
          queryMap.set(domain, (queryMap.get(domain) || 0) + count);
        });
      });
    });

    // Build matrix
    const matrix = queries.map((query) => {
      const queryMap = correlationMap.get(query) || new Map();
      return domains.map((domain) => queryMap.get(domain) || 0);
    });

    return { queries, domains, matrix };
  };

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);

    try {
      // Determine entity filters
      const isAllSelected = selectedEntities === "all";
      const entitiesList = isAllSelected ? [] : selectedEntities;

      // If "all" selected or single entity, make single calls
      if (isAllSelected || entitiesList.length === 1) {
        const entityId = isAllSelected ? null : entitiesList[0]?.id || null;
        const entityType = isAllSelected ? null : entitiesList[0]?.type || null;

        const [overviewData, wordCloud, distribution, queries, correlation] = await Promise.all([
          getQueryOverview(selectedProjectId, dateRange.from, dateRange.to, platform, region, entityId, entityType),
          getQueryWordCloudData(selectedProjectId, dateRange.from, dateRange.to, platform, region, 50, entityId, entityType),
          getQueryPlatformDistribution(selectedProjectId, dateRange.from, dateRange.to, region, entityId, entityType),
          getTopQueries(selectedProjectId, 20, dateRange.from, dateRange.to, platform, region, entityId, entityType),
          getQueryDomainCorrelation(selectedProjectId, dateRange.from, dateRange.to, platform, region, 10, 10, entityId, entityType),
        ]);

        setOverview(overviewData);
        setWordCloudData(wordCloud);
        setPlatformDistribution(distribution);
        setTopQueries(queries);
        setDomainCorrelation(correlation);
      } else {
        // Multiple entities selected - make separate calls and merge
        const resultsPromises = entitiesList.map(async (entity) => {
          const [overview, wordCloud, distribution, queries, correlation] = await Promise.all([
            getQueryOverview(selectedProjectId, dateRange.from, dateRange.to, platform, region, entity.id, entity.type),
            getQueryWordCloudData(selectedProjectId, dateRange.from, dateRange.to, platform, region, 50, entity.id, entity.type),
            getQueryPlatformDistribution(selectedProjectId, dateRange.from, dateRange.to, region, entity.id, entity.type),
            getTopQueries(selectedProjectId, 20, dateRange.from, dateRange.to, platform, region, entity.id, entity.type),
            getQueryDomainCorrelation(selectedProjectId, dateRange.from, dateRange.to, platform, region, 10, 10, entity.id, entity.type),
          ]);
          return { overview, wordCloud, distribution, queries, correlation };
        });

        const results = await Promise.all(resultsPromises);

        // Merge results
        const mergedOverview = mergeQueryOverview(results.map((r) => r.overview));
        const mergedWordCloud = mergeWordCloudData(results.map((r) => r.wordCloud));
        const mergedDistribution = mergePlatformDistribution(results.map((r) => r.distribution));
        const mergedQueries = mergeTopQueries(results.map((r) => r.queries));
        const mergedCorrelation = mergeQueryDomainCorrelation(results.map((r) => r.correlation));

        setOverview(mergedOverview);
        setWordCloudData(mergedWordCloud);
        setPlatformDistribution(mergedDistribution);
        setTopQueries(mergedQueries);
        setDomainCorrelation(mergedCorrelation);
      }
    } catch (error) {
      console.error("Error loading query data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, dateRange, platform, region, selectedEntities]);

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
    selectedEntities?: EntityFilterValue;
  }) => {
    setDateRange(filters.dateRange);
    setPlatform(filters.platform);
    setRegion(filters.region);
    if (filters.selectedEntities !== undefined) {
      setSelectedEntities(filters.selectedEntities);
    }
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
        showEntityFilter={true}
        selectedEntities={selectedEntities}
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

      {/* Section 4: Top Queries Table */}
      <TopQueriesTable data={topQueries} isLoading={isLoading} />

      {/* Section 6: Query-Domain Correlation */}
      {domainCorrelation && (
        <QueryDomainHeatmap data={domainCorrelation} isLoading={isLoading} />
      )}
    </div>
  );
}
