"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/citations/metric-card";
import { CitationsEvolutionChart } from "@/components/citations/citations-evolution-chart";
import { CitationDRBreakdown } from "@/components/citations/citation-dr-breakdown";
import { MostCitedDomainsTable } from "@/components/citations/most-cited-domains-table";
import { TopPerformingPagesTable } from "@/components/citations/top-performing-pages-table";
import { CompetitiveTopicsTable } from "@/components/citations/competitive-topics-table";
import { CitationSourcesTable } from "@/components/citations/citation-sources-table";
import {
  FileText,
  Link2,
  Globe,
  Award,
} from "lucide-react";
import {
  getQuickLookMetrics,
  getCitationsEvolution,
  getDRBreakdown,
  getMostCitedDomains,
  getTopPerformingPages,
  getCompetitiveTopicAnalysis,
  getCitationSources,
} from "@/lib/queries/citations-real";
import { getCompetitorsByRegion } from "@/lib/actions/competitors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";

export default function CitationsPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [quickMetrics, setQuickMetrics] = useState<any>(null);
  const [drBreakdown, setDRBreakdown] = useState<any>({ high: 0, medium: 0, low: 0, unverified: 0 });
  const [mostCitedDomains, setMostCitedDomains] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [competitiveTopics, setCompetitiveTopics] = useState<any[]>([]);
  const [citationSources, setCitationSources] = useState<any[]>([]);
  const [citationSourcesTotal, setCitationSourcesTotal] = useState(0);
  const [citationSourcesPage, setCitationSourcesPage] = useState(1);
  const [citationSourcesPageSize] = useState(10);
  const [citationSourcesTotalPages, setCitationSourcesTotalPages] = useState(0);

  // Filters state
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    from: subDays(new Date(), 29),
    to: new Date(),
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
    
        try {
          const [
            metricsData,
            drResult,
            domainsResult,
            pagesResult,
            topicsResult,
          ] = await Promise.all([
            getQuickLookMetrics(selectedProjectId, filtersPayload),
            getDRBreakdown(selectedProjectId, filtersPayload),
            getMostCitedDomains(selectedProjectId, 10, filtersPayload),
            getTopPerformingPages(selectedProjectId, 10, filtersPayload),
            getCompetitiveTopicAnalysis(selectedProjectId, filtersPayload),
          ]);

          setQuickMetrics(metricsData);
          setDRBreakdown(drResult);
          setMostCitedDomains(domainsResult);
          setTopPages(pagesResult);
          setCompetitiveTopics(topicsResult);
        } catch (error) {
          console.error("Error loading citation data:", error);
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

      {/* Quick Look Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Citation Pages"
          value={quickMetrics.totalCitationPages.toLocaleString()}
          description="Unique pages citing your domain"
          icon={<FileText className="h-5 w-5" />}
          trend={{ value: 12.5, direction: "up" }}
        />
        <MetricCard
          title="My Pages Cited"
          value={quickMetrics.myPagesCited}
          description="Your pages referenced by AI"
          icon={<Link2 className="h-5 w-5" />}
          trend={{ value: 8.3, direction: "up" }}
        />
        <MetricCard
          title="Domains Mentioning Me"
          value={quickMetrics.domainsMentioningMe}
          description="Unique domains referencing you"
          icon={<Globe className="h-5 w-5" />}
          trend={{ value: 15.7, direction: "up" }}
        />
        <MetricCard
          title="Your Domain Rating"
          value={quickMetrics.yourDomainRating}
          description="Domain authority score (0-100)"
          icon={<Award className="h-5 w-5" />}
          trend={{ value: 2.1, direction: "up" }}
        />
      </div>

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

      {/* DR Breakdown and Most Cited Domains - Side by Side */}
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <CitationDRBreakdown data={drBreakdown} />
        <MostCitedDomainsTable data={mostCitedDomains} />
      </div>

      {/* Citation Sources - Individual URLs */}
      <CitationSourcesTable
        data={citationSources}
        total={citationSourcesTotal}
        page={citationSourcesPage}
        pageSize={citationSourcesPageSize}
        totalPages={citationSourcesTotalPages}
        onPageChange={setCitationSourcesPage}
      />

      {/* Tabs for additional insights */}
      <Tabs defaultValue="topics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="topics">Competitive Analysis</TabsTrigger>
          <TabsTrigger value="pages">Top Performing Pages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="topics" className="mt-6">
          <CompetitiveTopicsTable data={competitiveTopics} />
        </TabsContent>
        
        <TabsContent value="pages" className="mt-6">
          <TopPerformingPagesTable data={topPages} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
