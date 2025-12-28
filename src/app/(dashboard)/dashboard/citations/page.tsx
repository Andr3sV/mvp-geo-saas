"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useProject } from "@/contexts/project-context";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { CitationsEvolutionChart } from "@/components/citations/citations-evolution-chart";
import { MostCitedDomainsTable } from "@/components/citations/most-cited-domains-table";
import { CitationSourcesTable } from "@/components/citations/citation-sources-table";
import { MarketShareDistribution } from "@/components/share-of-voice/market-share-distribution";
import { ShareEvolutionChart } from "@/components/share-of-voice/share-evolution-chart";
// import { MomentumMatrix } from "@/components/share-of-voice/momentum-matrix";
// import { CompetitiveGapTracker } from "@/components/share-of-voice/competitive-gap-tracker";
import { TrendingUp, Users, Trophy, FileText } from "lucide-react";
import {
  getCitationsData,
  getCitationsEvolution,
  getMostCitedDomains,
  getCitationSources,
  getCitationsTrends,
  getCitationsShareEvolution,
} from "@/lib/queries/citations-real";
import { getCompetitorsByRegion } from "@/lib/actions/competitors";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { WelcomeTip } from "@/components/dashboard/welcome-tip";


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
  // Date range state (default to current week - Monday to today)
  const [dateRange, setDateRange] = useState<DateRangeValue>(getCurrentWeekDateRange());
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("GLOBAL");
  const [topicId, setTopicId] = useState<string>("all");

  // Evolution chart state
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [evolutionBrandName, setEvolutionBrandName] = useState("");
  const [evolutionBrandDomain, setEvolutionBrandDomain] = useState("");
  const [evolutionBrandColor, setEvolutionBrandColor] = useState<string | undefined>(undefined);
  const [evolutionCompetitorName, setEvolutionCompetitorName] = useState("");
  const [evolutionCompetitorDomain, setEvolutionCompetitorDomain] = useState("");
  const [evolutionCompetitorColor, setEvolutionCompetitorColor] = useState<string | undefined>(undefined);
  const [regionFilteredCompetitors, setRegionFilteredCompetitors] = useState<any[]>([]);
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(false);

  // Strategic charts data (matching Share of Mentions)
  const [trendsData, setTrendsData] = useState<any>({ brandTrend: 0, competitorTrends: [] });
  const [shareEvolutionData, setShareEvolutionData] = useState<any>({ data: [], entities: [] });
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);

  // Cache competitors by region to avoid redundant queries (useRef to persist across renders)
  const competitorsCache = useRef(new Map<string, any[]>());
  
  // Refs to prevent duplicate loads
  const isLoadingRef = useRef(false);
  const hasLoadedInitialData = useRef(false);
  const isResettingCompetitorRef = useRef(false);

  // Define functions before useEffect hooks that use them
  const loadRegionFilteredCompetitors = useCallback(async () => {
    if (!selectedProjectId) return;

    const cacheKey = `${selectedProjectId}-${region}`;

    // Check cache first
    if (competitorsCache.current.has(cacheKey)) {
      setRegionFilteredCompetitors(competitorsCache.current.get(cacheKey)!);
      return;
    }

    try {
      const result = await getCompetitorsByRegion(selectedProjectId, region);
      if (result.data) {
        const competitorsForSelector = result.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          domain: c.domain || c.name,
        }));
        
        // Cache the result
        competitorsCache.current.set(cacheKey, competitorsForSelector);
        setRegionFilteredCompetitors(competitorsForSelector);
      }
    } catch (error) {
      console.error("Error loading region filtered competitors:", error);
    }
  }, [selectedProjectId, region]);

  const loadData = useCallback(async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    // Prevent duplicate loads
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    setIsLoading(true);
    setIsLoadingCharts(true);
    
    try {
      // =============================================
      // PHASE 1: Load Critical Data (Stats Cards)
      // =============================================
      // These queries are essential for showing the initial UI
      const [citationsData, trends] = await Promise.all([
        getCitationsData(selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId),
        getCitationsTrends(selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId),
      ]);

      // Extract data from unified response
      setQuickMetrics({
        totalCitationPages: citationsData.totalCitationPages,
        myPagesCited: citationsData.myPagesCited,
        ranking: citationsData.ranking,
      });
      setCitationsRanking({
        brand: citationsData.brand,
        competitors: citationsData.competitors,
        totalCitations: citationsData.totalCitations,
        marketPosition: citationsData.marketPosition,
      });
      setTrendsData(trends);

      // =============================================
      // PHASE 2: Load Important Data (Charts)
      // =============================================
      // Load after critical data is ready, but don't block UI
      getCitationsShareEvolution(selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId)
        .then((shareEvo) => {
          setShareEvolutionData(shareEvo);
          setIsLoadingCharts(false);
        })
        .catch((error) => {
          console.error("Error loading share evolution data:", error);
          setIsLoadingCharts(false);
        });

      // =============================================
      // PHASE 3: Load Secondary Data (Tables)
      // =============================================
      // Load after critical data is ready, lowest priority
      // This query is very slow (queries citations table directly) so it's deferred
      console.log("🔄 [CitationsPage] Starting to load most cited domains...", {
        projectId: selectedProjectId,
        filters: {
          fromDate: dateRange.from?.toISOString(),
          toDate: dateRange.to?.toISOString(),
          platform,
          region,
          topicId,
        },
      });
      
      getMostCitedDomains(selectedProjectId, 10, {
        fromDate: dateRange.from,
        toDate: dateRange.to,
        platform,
        region,
        topicId,
      })
        .then((domainsResult) => {
          console.log("✅ [CitationsPage] Most cited domains loaded:", {
            count: domainsResult?.length || 0,
            domains: domainsResult?.slice(0, 3),
            fullResult: domainsResult,
            isEmpty: !domainsResult || domainsResult.length === 0,
          });
          setMostCitedDomains(domainsResult || []);
        })
        .catch((error) => {
          console.error("❌ [CitationsPage] Error loading most cited domains:", {
            error,
            message: error?.message,
            stack: error?.stack,
          });
          setMostCitedDomains([]); // Set empty array on error
        });
    } catch (error) {
      console.error("Error loading citation data:", error);
      setIsLoadingCharts(false);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      hasLoadedInitialData.current = true;
    }
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId]);

  const loadEvolutionData = useCallback(async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    // Don't load if it's a region reset (prevents unnecessary load when region changes)
    if (isResettingCompetitorRef.current) {
      isResettingCompetitorRef.current = false;
      return;
    }

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
      setEvolutionBrandColor(evolution.brandColor);
      setEvolutionCompetitorName(evolution.competitorName);
      setEvolutionCompetitorDomain(evolution.competitorDomain);
      setEvolutionCompetitorColor(evolution.competitorColor);
    } catch (error) {
      console.error("Error loading evolution data:", error);
    } finally {
      setIsLoadingEvolution(false);
    }
  }, [selectedProjectId, selectedCompetitorId, dateRange.from, dateRange.to, platform, region, topicId]);

  const loadCitationSources = useCallback(async () => {
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
  }, [selectedProjectId, citationSourcesPage, dateRange.from, dateRange.to, platform, region, topicId, citationSourcesPageSize]);

  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadData();
    }
  }, [loadData]);

  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadCitationSources();
    }
  }, [loadCitationSources]);

  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadEvolutionData();
    }
  }, [loadEvolutionData]);

  useEffect(() => {
    if (selectedProjectId) {
      loadRegionFilteredCompetitors();
    }
  }, [selectedProjectId, loadRegionFilteredCompetitors]);

  // Separate useEffect for resetting competitor when region changes
  useEffect(() => {
    isResettingCompetitorRef.current = true;
    setSelectedCompetitorId(null);
  }, [region]);

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
      setTopicId(filters.topicId);
    }
    setCitationSourcesPage(1);
  };

  // Memoize stats calculations
  const statsCalculations = useMemo(() => {
    if (!citationsRanking) {
      return {
        brandPercentage: 0,
        totalCitations: 0,
        brandCitations: 0,
        competitorCitations: 0,
      };
    }

        const brandCitations = citationsRanking?.brand?.citations || 0;
        const competitorCitations = citationsRanking?.competitors?.reduce(
          (sum: number, comp: any) => sum + (comp.citations || 0), 0
        ) || 0;
        const totalCitations = brandCitations + competitorCitations;
        const brandPercentage = totalCitations > 0 
          ? Number(((brandCitations / totalCitations) * 100).toFixed(1)) 
          : 0;
        
    return { brandPercentage, totalCitations, brandCitations, competitorCitations };
  }, [citationsRanking]);

  // Memoize filtered entities calculations
  const filteredEntities = useMemo(() => {
    if (!citationsRanking || !regionFilteredCompetitors.length) {
      return { allEntities: [] };
    }

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
            color: citationsRanking?.brand?.color,
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
            color: comp.color,
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

    return { allEntities };
  }, [citationsRanking, regionFilteredCompetitors, trendsData]);

        return (
    <div className="space-y-6">
      <PageHeader
        title="Share of citations"
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

      {/* Definition Tip */}
      <WelcomeTip id="what-are-citations">
        <strong>🔗 What is a Citation?</strong> — When an AI model references your brand AND explicitly states the source of that information (e.g., &quot;According to example.com...&quot;). Citations are more valuable than mentions because they include a direct reference to your content.
      </WelcomeTip>

      {/* Stats Cards - Matching Share of Mentions UI */}
      {isLoading || !quickMetrics ? (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="" value="" description="" icon={Trophy} isLoading={true} />
          <StatCard title="" value="" description="" icon={FileText} isLoading={true} />
          <StatCard title="" value="" description="" icon={TrendingUp} isLoading={true} />
          <StatCard title="" value="" description="" icon={Users} isLoading={true} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Your Share"
            value={`${statsCalculations.brandPercentage}%`}
            description="Share vs competitors"
            icon={Trophy}
            tooltip="The percentage of all AI citations that reference your brand compared to your tracked competitors."
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
            value={statsCalculations.totalCitations.toLocaleString()}
            description="Total citations across all brands"
            icon={FileText}
            tooltip="The total number of times AI platforms have cited any brand (yours + competitors) with source attribution in the selected period."
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
            tooltip="Your ranking among all tracked brands based on citation count. #1 means you have the most citations."
          />
          <StatCard
            title="Competitors Tracked"
            value={citationsRanking?.competitors?.length || 0}
            description="Active competitors"
            icon={Users}
            tooltip="The number of competitor brands you're currently monitoring and comparing against."
          />
        </div>
      )}

      {/* Citations Evolution Chart - Full Width */}
      <CitationsEvolutionChart
        data={evolutionData}
        brandName={evolutionBrandName}
        brandDomain={evolutionBrandDomain}
        brandColor={evolutionBrandColor || citationsRanking?.brand?.color}
        competitorName={evolutionCompetitorName}
        competitorDomain={evolutionCompetitorDomain}
        competitorColor={evolutionCompetitorColor || (selectedCompetitorId ? regionFilteredCompetitors.find(c => c.id === selectedCompetitorId)?.color : undefined)}
        competitors={regionFilteredCompetitors}
        selectedCompetitorId={selectedCompetitorId}
        onCompetitorChange={setSelectedCompetitorId}
        isLoading={isLoadingEvolution}
        infoTooltip="Daily citation count over time. Compare your trend against a competitor to see who's gaining authority in AI responses."
      />

      {/* Strategic Charts - Matching Share of Mentions UI */}
          <>
            {/* Market Share Distribution */}
            <MarketShareDistribution 
          entities={filteredEntities.allEntities} 
              isLoading={isLoading} 
              metricLabel="citations"
              infoTooltip="Visual breakdown showing what percentage of all AI citations each brand captures. Larger bars indicate higher citation authority."
            />

            {/* Share Evolution Chart */}
            <ShareEvolutionChart
              data={shareEvolutionData.data}
              entities={shareEvolutionData.entities}
              isLoading={isLoadingCharts}
              infoTooltip="Line chart tracking how each brand's citation market share has changed over the selected time period."
            />

            {/* Competitive Momentum Matrix */}
        {/* <MomentumMatrix entities={filteredEntities.allEntities} isLoading={isLoadingCharts} metricLabel="citations" /> */}

            {/* Competitive Gap Tracker */}
        {/* <CompetitiveGapTracker entities={filteredEntities.allEntities} isLoading={isLoadingCharts} metricLabel="citations" /> */}
          </>

      {/* Most Cited Domains */}
      <MostCitedDomainsTable 
        data={mostCitedDomains}
        infoTooltip="Ranking of which domains AI platforms cite most frequently. These are the websites that AI models trust as authoritative sources."
      />

      {/* Citation Sources - Individual URLs */}
      <CitationSourcesTable
        data={citationSources}
        total={citationSourcesTotal}
        page={citationSourcesPage}
        pageSize={citationSourcesPageSize}
        totalPages={citationSourcesTotalPages}
        onPageChange={setCitationSourcesPage}
        infoTooltip="Specific URLs that AI platforms are referencing in their responses. Click to visit the original source."
      />
    </div>
  );
}
