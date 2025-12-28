"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { TrendingUp, Users, Trophy, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { useProject } from "@/contexts/project-context";
import {
  getShareOfVoice,
  getShareOfVoiceTrends,
  getShareOfVoiceInsights,
  getShareOfVoiceOverTime,
  getShareEvolution,
} from "@/lib/queries/share-of-voice";
import { getCompetitorsByRegion } from "@/lib/actions/competitors";
import { MentionsEvolutionChart } from "@/components/share-of-voice/mentions-evolution-chart";
import { MarketShareDistribution } from "@/components/share-of-voice/market-share-distribution";
import { ShareEvolutionChart } from "@/components/share-of-voice/share-evolution-chart";
import { WelcomeTip } from "@/components/dashboard/welcome-tip";
// import { MomentumMatrix } from "@/components/share-of-voice/momentum-matrix";
// import { CompetitiveGapTracker } from "@/components/share-of-voice/competitive-gap-tracker";
import { DateRangeValue } from "@/components/ui/date-range-picker";


export default function ShareOfVoicePage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [sovData, setSovData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  
  // Date range state (default to current week - Monday to today)
  const [dateRange, setDateRange] = useState<DateRangeValue>(getCurrentWeekDateRange());
  
  // Platform filter state
  const [platform, setPlatform] = useState<string>("all");
  
  // Region filter state
  const [region, setRegion] = useState<string>("GLOBAL");
  
  // Topic filter state
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
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(false);
  const [regionFilteredCompetitors, setRegionFilteredCompetitors] = useState<any[]>([]);

  // New charts data
  const [shareEvolutionData, setShareEvolutionData] = useState<any>({ data: [], entities: [] });
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);

  // Cache competitors by region to avoid redundant queries (useRef to persist across renders)
  const competitorsCache = useRef(new Map<string, any[]>());

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
      } else if (result.error) {
        console.error('❌ [loadRegionFilteredCompetitors] Error:', result.error);
      }
    } catch (error) {
      console.error("❌ [loadRegionFilteredCompetitors] Exception:", error);
    }
  }, [selectedProjectId, region]);

  const loadData = useCallback(async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    setIsLoading(true);
    setIsLoadingCharts(true);

    try {
      const [sov, trends] = await Promise.all([
        getShareOfVoice(selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId),
        getShareOfVoiceTrends(selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId),
      ]);

      // Calculate insights using already fetched data (no additional queries)
      const insightsData = await getShareOfVoiceInsights(sov, trends);

      setSovData(sov);
      setTrendsData(trends);
      setInsights(insightsData);

      // Load additional chart data in parallel (non-blocking)
      getShareEvolution(selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId)
        .then((shareEvo) => {
          setShareEvolutionData(shareEvo);
          setIsLoadingCharts(false);
        })
        .catch((error) => {
          console.error("Error loading chart data:", error);
          setIsLoadingCharts(false);
        });
    } catch (error) {
      console.error("Error loading Share of Voice data:", error);
      setIsLoadingCharts(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId]);

  const loadEvolutionData = useCallback(async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    setIsLoadingEvolution(true);

    try {
      const evolution = await getShareOfVoiceOverTime(
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

  // Memoize competitors array to prevent unnecessary re-renders
  const memoizedCompetitors = useMemo(() => regionFilteredCompetitors, [regionFilteredCompetitors]);

  // useEffect hooks that use the functions defined above
  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadData();
    }
  }, [loadData, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadEvolutionData();
    }
  }, [loadEvolutionData, dateRange.from, dateRange.to]);

  // Load competitors filtered by region for the selector
  useEffect(() => {
    if (selectedProjectId) {
      loadRegionFilteredCompetitors();
      // Reset selected competitor when region changes
      setSelectedCompetitorId(null);
    }
  }, [selectedProjectId, loadRegionFilteredCompetitors]);

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
  };

  if (isLoading || !sovData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Share of mentions"
          description="Compare your brand mentions against competitors in AI responses"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading share of voice data...</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Share of mentions"
        description="Compare your brand mentions against competitors in AI responses"
      />

      <FiltersToolbar 
        dateRange={dateRange}
        platform={platform}
        region={region}
        topicId={topicId}
        onApply={handleFiltersChange} 
      />

      {/* Definition Tip */}
      <WelcomeTip id="what-are-mentions">
        <strong>💬 What is a Mention?</strong> — When an AI model names your brand, person, or concept in its response, but doesn&apos;t specify where that information comes from.
      </WelcomeTip>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Your Share"
          value={`${sovData.brand.percentage}%`}
          description="Share vs competitors"
          icon={Trophy}
          tooltip="The percentage of all AI mentions that reference your brand compared to your tracked competitors."
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
          title="Total Mentions"
          value={sovData.totalMentions.toLocaleString()}
          description="Total mentions across all brands"
          icon={MessageSquare}
          tooltip="The total number of times AI platforms have mentioned any brand (yours + competitors) in the selected period."
        />
        <StatCard
          title="Market Position"
          value={`#${sovData.marketPosition}`}
          description={
            sovData.marketPosition === 1
              ? "Leading in your category"
              : `${sovData.competitors[0]?.name || "Competitor"} is leading`
          }
          icon={TrendingUp}
          tooltip="Your ranking among all tracked brands based on mention count. #1 means you have the most mentions."
        />
        <StatCard
          title="Competitors Tracked"
          value={sovData.competitors.length}
          description="Active competitors"
          icon={Users}
          tooltip="The number of competitor brands you're currently monitoring and comparing against."
        />
      </div>

      {/* Mentions Evolution Chart */}
      <MentionsEvolutionChart
        data={evolutionData}
        brandName={evolutionBrandName}
        brandDomain={evolutionBrandDomain}
        brandColor={evolutionBrandColor || sovData.brand.color}
        competitorName={evolutionCompetitorName}
        competitorDomain={evolutionCompetitorDomain}
        competitorColor={evolutionCompetitorColor || (selectedCompetitorId ? regionFilteredCompetitors.find(c => c.id === selectedCompetitorId)?.color : undefined)}
        competitors={memoizedCompetitors}
        selectedCompetitorId={selectedCompetitorId}
        onCompetitorChange={setSelectedCompetitorId}
        isLoading={isLoadingEvolution}
      />

      {/* Share of Voice Chart */}
            {(() => {
              // Filter competitors to only show those assigned to the selected region
              const regionCompetitorIds = new Set(regionFilteredCompetitors.map(c => c.id));
              const filteredCompetitors = sovData.competitors.filter((comp: any) =>
                regionCompetitorIds.has(comp.id)
              );

              // Recalculate total mentions and percentages based on filtered competitors
              const filteredCompetitorMentions = filteredCompetitors.reduce(
                (sum: number, comp: any) => sum + comp.mentions,
                0
              );
              const filteredTotalMentions = sovData.brand.mentions + filteredCompetitorMentions;

              // Combine brand and filtered competitors with recalculated percentages
              const allEntities = [
                {
                  id: "brand",
                  name: sovData.brand.name,
                  domain: sovData.brand.domain,
                  color: sovData.brand.color,
                  mentions: sovData.brand.mentions,
                  percentage:
                    filteredTotalMentions > 0
                      ? Number(((sovData.brand.mentions / filteredTotalMentions) * 100).toFixed(1))
                      : 0,
                  isBrand: true,
                  trend: trendsData.brandTrend,
                },
                ...filteredCompetitors.map((comp: any) => ({
                  id: comp.id,
                  name: comp.name,
                  domain: comp.domain,
                  color: comp.color,
                  mentions: comp.mentions,
                  percentage:
                    filteredTotalMentions > 0
                      ? Number(((comp.mentions / filteredTotalMentions) * 100).toFixed(1))
                      : 0,
                  isBrand: false,
                  trend:
                    trendsData.competitorTrends.find((t: any) => t.name === comp.name)
                      ?.trend || 0,
                })),
              ];

              // Sort by percentage descending
              allEntities.sort((a, b) => b.percentage - a.percentage);

                return (
          <>
            <MarketShareDistribution entities={allEntities} isLoading={isLoading} />

            {/* Share Evolution Chart - Right after Market Share Distribution */}
            <ShareEvolutionChart
              data={shareEvolutionData.data}
              entities={shareEvolutionData.entities}
              isLoading={isLoadingCharts}
            />

            {/* Competitive Momentum Matrix - Full row */}
            {/* <MomentumMatrix entities={allEntities} isLoading={isLoadingCharts} /> */}

            {/* Competitive Gap Tracker - Full row, top 4 competitors */}
            {/* <CompetitiveGapTracker entities={allEntities} isLoading={isLoadingCharts} /> */}
          </>
        );
            })()}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>AI-powered recommendations based on your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => {
                const colorMap: Record<
                  string,
                  { border: string; bg: string; title: string; desc: string }
                > = {
                  success: {
                    border: "border-green-200 dark:border-green-900",
                    bg: "bg-green-50 dark:bg-green-950/20",
                    title: "text-green-900 dark:text-green-100",
                    desc: "text-green-700 dark:text-green-300",
                  },
                  info: {
                    border: "border-blue-200 dark:border-blue-900",
                    bg: "bg-blue-50 dark:bg-blue-950/20",
                    title: "text-blue-900 dark:text-blue-100",
                    desc: "text-blue-700 dark:text-blue-300",
                  },
                  warning: {
                    border: "border-amber-200 dark:border-amber-900",
                    bg: "bg-amber-50 dark:bg-amber-950/20",
                    title: "text-amber-900 dark:text-amber-100",
                    desc: "text-amber-700 dark:text-amber-300",
                  },
                  opportunity: {
                    border: "border-purple-200 dark:border-purple-900",
                    bg: "bg-purple-50 dark:bg-purple-950/20",
                    title: "text-purple-900 dark:text-purple-100",
                    desc: "text-purple-700 dark:text-purple-300",
                  },
                };

                const colors = colorMap[insight.type] || colorMap.info;

                return (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 ${colors.border} ${colors.bg}`}
                  >
                    <p className={`font-medium ${colors.title}`}>{insight.title}</p>
                    <p className={`mt-1 text-sm ${colors.desc}`}>{insight.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

