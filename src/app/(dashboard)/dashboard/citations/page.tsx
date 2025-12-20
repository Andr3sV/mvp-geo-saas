"use client";

import { useEffect, useState } from "react";
import { startOfWeek } from "date-fns";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { CitationsEvolutionChart } from "@/components/citations/citations-evolution-chart";
import { MostCitedDomainsTable } from "@/components/citations/most-cited-domains-table";
import { CitationSourcesTable } from "@/components/citations/citation-sources-table";
import { MarketShareDistribution } from "@/components/share-of-voice/market-share-distribution";
import { ShareEvolutionChart } from "@/components/share-of-voice/share-evolution-chart";
import { MomentumMatrix } from "@/components/share-of-voice/momentum-matrix";
import { CompetitiveGapTracker } from "@/components/share-of-voice/competitive-gap-tracker";
import { TrendingUp, Users, Trophy, FileText } from "lucide-react";
import {
  getQuickLookMetrics,
  getCitationsEvolution,
  getMostCitedDomains,
  getCitationSources,
  getCitationsRanking,
  getCitationsTrends,
  getCitationsShareEvolution,
} from "@/lib/queries/citations-real";
import { getCompetitorsByRegion } from "@/lib/actions/competitors";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";

/**
 * Get yesterday's date (end of day is yesterday, not today, since today's data won't be available until tomorrow)
 */
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  return yesterday;
}

export default function CitationsPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [quickMetrics, setQuickMetrics] = useState<any>(null);
  const [citationsRanking, setCitationsRanking] = useState<any>(null);
  const [mostCitedDomains, setMostCitedDomains] = useState<any[]>([]);
  const [citationSources, setCitationSources] = useState<any[]>([]);
  const [citationSourcesTotal, setCitationSourcesTotal] = useState(0);
  const [citationSourcesPage, setCitationSourcesPage] = useState(1);
  const [citationSourcesPageSize] = useState(10);
  const [citationSourcesTotalPages, setCitationSourcesTotalPages] = useState(0);

  // Filters state
  // Date range state (default to current week - Monday to yesterday)
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    from: (() => {
      const date = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      date.setHours(0, 0, 0, 0);
      return date;
    })(),
    to: getYesterday(),
  });
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("GLOBAL");
  const [topicId, setTopicId] = useState<string>("all");

  // Evolution chart state
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [evolutionBrandName, setEvolutionBrandName] = useState("");
  const [evolutionBrandDomain, setEvolutionBrandDomain] = useState("");
  const [evolutionCompetitorName, setEvolutionCompetitorName] = useState("");
  const [evolutionCompetitorDomain, setEvolutionCompetitorDomain] = useState("");
  const [regionFilteredCompetitors, setRegionFilteredCompetitors] = useState<any[]>([]);
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(false);

  // Strategic charts data (matching Share of Mentions)
  const [trendsData, setTrendsData] = useState<any>({ brandTrend: 0, competitorTrends: [] });
  const [shareEvolutionData, setShareEvolutionData] = useState<any>({ data: [], entities: [] });
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);

  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId]);

  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadCitationSources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, citationSourcesPage, dateRange.from, dateRange.to, platform, region, topicId]);

  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadEvolutionData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, selectedCompetitorId, dateRange.from, dateRange.to, platform, region, topicId]);

  // Load competitors filtered by region for the selector
  useEffect(() => {
    if (selectedProjectId) {
      loadRegionFilteredCompetitors();
      // Reset selected competitor when region changes
      setSelectedCompetitorId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, region]);

  const loadRegionFilteredCompetitors = async () => {
    if (!selectedProjectId) return;

    try {
      const result = await getCompetitorsByRegion(selectedProjectId, region);
      if (result.data) {
        const competitorsForSelector = result.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          domain: c.domain || c.name,
        }));
        setRegionFilteredCompetitors(competitorsForSelector);
      }
    } catch (error) {
      console.error("Error loading region filtered competitors:", error);
    }
  };

  const loadEvolutionData = async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    setIsLoadingEvolution(true);

    try {
      const evolution = await getCitationsEvolution(
        selectedProjectId,
        selectedCompetitorId,
        dateRange.from,
        dateRange.to,
        platform,
        region,
        topicId
      );

      setEvolutionData(evolution.data);
      setEvolutionBrandName(evolution.brandName);
      setEvolutionBrandDomain(evolution.brandDomain);
      setEvolutionCompetitorName(evolution.competitorName);
      setEvolutionCompetitorDomain(evolution.competitorDomain);
    } catch (error) {
      console.error("Error loading evolution data:", error);
    } finally {
      setIsLoadingEvolution(false);
    }
  };

  const handleFiltersChange = (filters: {
    region: string;
    dateRange: DateRangeValue;
    platform: string;
    topicId: string;
  }) => {
    if (filters.dateRange.from && filters.dateRange.to) {
      setDateRange(filters.dateRange);
    }
    setPlatform(filters.platform);
    setRegion(filters.region);
    setTopicId(filters.topicId);
    setCitationSourcesPage(1);
  };

  const loadCitationSources = async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    const filtersPayload = {
      fromDate: dateRange.from,
      toDate: dateRange.to,
      platform,
      region,
      topicId,
    };

    try {
      const sourcesResult = await getCitationSources(
        selectedProjectId,
        citationSourcesPage,
        citationSourcesPageSize,
        filtersPayload
      );

      setCitationSources(sourcesResult.data);
      setCitationSourcesTotal(sourcesResult.total);
      setCitationSourcesTotalPages(sourcesResult.totalPages);
    } catch (error) {
      console.error("Error loading citation sources:", error);
    }
  };

  const loadData = async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;
    
    const filtersPayload = {
      fromDate: dateRange.from,
      toDate: dateRange.to,
      platform,
      region,
      topicId,
    };

    setIsLoading(true);
    setIsLoadingCharts(true);
    
        try {
          const [
            metricsData,
        rankingData,
            domainsResult,
        trends,
          ] = await Promise.all([
            getQuickLookMetrics(selectedProjectId, filtersPayload),
        getCitationsRanking(selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId),
            getMostCitedDomains(selectedProjectId, 10, filtersPayload),
        getCitationsTrends(selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId),
          ]);

          setQuickMetrics(metricsData);
      setCitationsRanking(rankingData);
          setMostCitedDomains(domainsResult);
      setTrendsData(trends);

      // Load share evolution data in parallel (non-blocking)
      getCitationsShareEvolution(selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId)
        .then((shareEvo) => {
          setShareEvolutionData(shareEvo);
          setIsLoadingCharts(false);
        })
        .catch((error) => {
          console.error("Error loading share evolution data:", error);
          setIsLoadingCharts(false);
        });
        } catch (error) {
          console.error("Error loading citation data:", error);
      setIsLoadingCharts(false);
        } finally {
          setIsLoading(false);
        }
  };

  if (isLoading || !quickMetrics) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Citation & domains"
          description="Monitor how AI platforms cite and reference your brand"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading citation data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citation & domains"
        description="Comprehensive analysis of your brand citations across AI platforms"
      />

      {/* Filters Toolbar */}
      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        topicId={topicId}
        onApply={handleFiltersChange}
      />

      {/* Stats Cards - Matching Share of Mentions UI */}
      {(() => {
        // Calculate totals from citationsRanking
        const brandCitations = citationsRanking?.brand?.citations || 0;
        const competitorCitations = citationsRanking?.competitors?.reduce(
          (sum: number, comp: any) => sum + (comp.citations || 0), 0
        ) || 0;
        const totalCitations = brandCitations + competitorCitations;
        const brandPercentage = totalCitations > 0 
          ? Number(((brandCitations / totalCitations) * 100).toFixed(1)) 
          : 0;
        
        return (
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Your Share"
              value={`${brandPercentage}%`}
              description="Share vs competitors"
              icon={Trophy}
              trend={
                trendsData.brandTrend !== 0
                  ? {
                      value: Math.abs(trendsData.brandTrend),
                      isPositive: trendsData.brandTrend > 0,
                    }
                  : undefined
              }
        />
            <StatCard
              title="Total Citations"
              value={totalCitations.toLocaleString()}
              description="Total citations across all brands"
              icon={FileText}
        />
            <StatCard
              title="Market Position"
              value={`#${quickMetrics.ranking?.position || 1}`}
              description={
                quickMetrics.ranking?.position === 1
                  ? "Leading in citations"
                  : `${citationsRanking?.competitors?.[0]?.name || "Competitor"} is leading`
              }
              icon={TrendingUp}
            />
            <StatCard
              title="Competitors Tracked"
              value={citationsRanking?.competitors?.length || 0}
              description="Active competitors"
              icon={Users}
        />
      </div>
        );
      })()}

      {/* Citations Evolution Chart - Full Width */}
      <CitationsEvolutionChart
        data={evolutionData}
        brandName={evolutionBrandName}
        brandDomain={evolutionBrandDomain}
        competitorName={evolutionCompetitorName}
        competitorDomain={evolutionCompetitorDomain}
        competitors={regionFilteredCompetitors}
        selectedCompetitorId={selectedCompetitorId}
        onCompetitorChange={setSelectedCompetitorId}
        isLoading={isLoadingEvolution}
      />

      {/* Strategic Charts - Matching Share of Mentions UI */}
      {(() => {
        // Filter competitors to only show those assigned to the selected region
        const regionCompetitorIds = new Set(regionFilteredCompetitors.map(c => c.id));
        const filteredCompetitors = citationsRanking?.competitors?.filter((comp: any) =>
          regionCompetitorIds.has(comp.id)
        ) || [];

        // Recalculate total citations and percentages based on filtered competitors
        const filteredCompetitorCitations = filteredCompetitors.reduce(
          (sum: number, comp: any) => sum + (comp.citations || 0),
          0
        );
        const filteredTotalCitations = (citationsRanking?.brand?.citations || 0) + filteredCompetitorCitations;

        // Combine brand and filtered competitors with recalculated percentages
        // Use "mentions" key for component compatibility
        const allEntities = [
          {
            id: "brand",
            name: citationsRanking?.brand?.name || "Your Brand",
            domain: citationsRanking?.brand?.domain || "",
            mentions: citationsRanking?.brand?.citations || 0,
            percentage:
              filteredTotalCitations > 0
                ? Number(((citationsRanking?.brand?.citations || 0) / filteredTotalCitations * 100).toFixed(1))
                : 0,
            isBrand: true,
            trend: trendsData.brandTrend || 0,
          },
          ...filteredCompetitors.map((comp: any) => ({
            id: comp.id,
            name: comp.name,
            domain: comp.domain,
            mentions: comp.citations || 0,
            percentage:
              filteredTotalCitations > 0
                ? Number(((comp.citations || 0) / filteredTotalCitations * 100).toFixed(1))
                : 0,
            isBrand: false,
            trend:
              trendsData.competitorTrends?.find((t: any) => t.name === comp.name)?.trend || 0,
          })),
        ];

        // Sort by percentage descending
        allEntities.sort((a, b) => b.percentage - a.percentage);

        return (
          <>
            {/* Market Share Distribution */}
            <MarketShareDistribution entities={allEntities} isLoading={isLoading} metricLabel="citations" />

            {/* Share Evolution Chart */}
            <ShareEvolutionChart
              data={shareEvolutionData.data}
              entities={shareEvolutionData.entities}
              isLoading={isLoadingCharts}
            />

            {/* Competitive Momentum Matrix */}
            <MomentumMatrix entities={allEntities} isLoading={isLoadingCharts} metricLabel="citations" />

            {/* Competitive Gap Tracker */}
            <CompetitiveGapTracker entities={allEntities} isLoading={isLoadingCharts} metricLabel="citations" />
          </>
        );
      })()}

      {/* Most Cited Domains */}
        <MostCitedDomainsTable data={mostCitedDomains} />

      {/* Citation Sources - Individual URLs */}
      <CitationSourcesTable
        data={citationSources}
        total={citationSourcesTotal}
        page={citationSourcesPage}
        pageSize={citationSourcesPageSize}
        totalPages={citationSourcesTotalPages}
        onPageChange={setCitationSourcesPage}
      />
    </div>
  );
}
