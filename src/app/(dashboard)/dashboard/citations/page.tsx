"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/citations/metric-card";
import { CitationsTimelineChart } from "@/components/citations/citations-timeline-chart";
import { CitationDRBreakdown } from "@/components/citations/citation-dr-breakdown";
import { MostCitedDomainsTable } from "@/components/citations/most-cited-domains-table";
import { HighValueOpportunitiesTable } from "@/components/citations/high-value-opportunities-table";
import { TopPerformingPagesTable } from "@/components/citations/top-performing-pages-table";
import { CompetitiveTopicsTable } from "@/components/citations/competitive-topics-table";
import {
  FileText,
  Link2,
  Globe,
  Award,
} from "lucide-react";
import {
  getQuickLookMetrics,
  getCitationsOverTime,
  getDRBreakdown,
  getMostCitedDomains,
  getHighValueOpportunities,
  getTopPerformingPages,
  getCompetitiveTopicAnalysis,
} from "@/lib/queries/citations-real";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";

export default function CitationsPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [quickMetrics, setQuickMetrics] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [drBreakdown, setDRBreakdown] = useState<any>({ high: 0, medium: 0, low: 0, unverified: 0 });
  const [mostCitedDomains, setMostCitedDomains] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [competitiveTopics, setCompetitiveTopics] = useState<any[]>([]);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId]);

  const loadData = async () => {
    if (!selectedProjectId) return;
    
    setIsLoading(true);
    
    try {
      const [
        metricsData,
        timelineResult,
        drResult,
        domainsResult,
        opportunitiesResult,
        pagesResult,
        topicsResult,
      ] = await Promise.all([
        getQuickLookMetrics(selectedProjectId),
        getCitationsOverTime(selectedProjectId, 30),
        getDRBreakdown(selectedProjectId),
        getMostCitedDomains(selectedProjectId, 10),
        getHighValueOpportunities(selectedProjectId, 10),
        getTopPerformingPages(selectedProjectId, 10),
        getCompetitiveTopicAnalysis(selectedProjectId),
      ]);

      setQuickMetrics(metricsData);
      setTimelineData(timelineResult);
      setDRBreakdown(drResult);
      setMostCitedDomains(domainsResult);
      setOpportunities(opportunitiesResult);
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
          title="Citation Tracking"
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
        title="Citation Tracking"
        description="Comprehensive analysis of your brand citations across AI platforms"
      />

      {/* Filters Toolbar */}
      <FiltersToolbar />

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

      {/* Timeline and DR Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CitationsTimelineChart data={timelineData} />
        <CitationDRBreakdown data={drBreakdown} />
      </div>

      {/* Most Cited Domains */}
      <MostCitedDomainsTable data={mostCitedDomains} />

      {/* Tabs for additional insights */}
      <Tabs defaultValue="opportunities" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="opportunities">High-Value Opportunities</TabsTrigger>
          <TabsTrigger value="pages">Top Performing Pages</TabsTrigger>
          <TabsTrigger value="topics">Competitive Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="opportunities" className="mt-6">
          <HighValueOpportunitiesTable data={opportunities} />
        </TabsContent>
        
        <TabsContent value="pages" className="mt-6">
          <TopPerformingPagesTable data={topPages} />
        </TabsContent>
        
        <TabsContent value="topics" className="mt-6">
          <CompetitiveTopicsTable data={competitiveTopics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
