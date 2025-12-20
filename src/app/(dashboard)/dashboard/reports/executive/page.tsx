"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { startOfWeek } from "date-fns";

// Executive Dashboard Components
import { CompetitiveHero } from "@/components/executive/competitive-hero";
import { BattleKPIs } from "@/components/executive/battle-kpis";
import { CompetitiveBattlefield } from "@/components/executive/competitive-battlefield";
import { WeeklyBattleReport } from "@/components/executive/weekly-battle-report";

// Types and queries
import {
  type CompetitiveBattlefieldData,
  type WeeklyBattleReportData,
  type MomentumScoreData,
  getCompetitiveBattlefield,
  getWeeklyBattleReport,
  getMomentumScore,
  getVisibilityScore,
} from "@/lib/queries/executive-overview";
import { type SentimentFilterOptions } from "@/lib/queries/sentiment-analysis";

// Get yesterday's date
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  return yesterday;
}

export default function ExecutiveOverviewPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);

  // Filter states - default to current week
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

  // Data states
  const [battlefieldData, setBattlefieldData] = useState<CompetitiveBattlefieldData | null>(null);
  const [weeklyReportData, setWeeklyReportData] = useState<WeeklyBattleReportData | null>(null);
  const [momentumData, setMomentumData] = useState<MomentumScoreData | null>(null);
  const [visibilityScore, setVisibilityScore] = useState<number>(0);
  const [brandName, setBrandName] = useState<string>("Your Brand");

  // Create filters object
  const filtersPayload: SentimentFilterOptions = {
    dateRange: dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined,
    platform: platform !== "all" ? platform : undefined,
    region: region !== "GLOBAL" ? region : undefined,
    topicId: topicId !== "all" ? topicId : undefined,
  };

  // Load all data
  const loadData = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    try {
      // Load all data in parallel
      const [battlefield, weeklyReport, momentum, visibility] = await Promise.all([
        getCompetitiveBattlefield(selectedProjectId, filtersPayload),
        getWeeklyBattleReport(selectedProjectId, filtersPayload),
        getMomentumScore(selectedProjectId, filtersPayload),
        getVisibilityScore(selectedProjectId, filtersPayload),
      ]);

      setBattlefieldData(battlefield);
      setWeeklyReportData(weeklyReport);
      setMomentumData(momentum);
      setVisibilityScore(visibility);

      // Set brand name from battlefield data
      if (battlefield?.brand) {
        setBrandName(battlefield.brand.name);
      }
    } catch (error) {
      console.error("Failed to load executive metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when project or filters change
  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId]);

  // Handle filters change
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
  };

  // Loading state
  if (isLoading && !battlefieldData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Executive Overview"
          description="Strategic competitive intelligence for leadership decision-making"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading executive dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Executive Overview"
        description="Strategic competitive intelligence for leadership decision-making"
      />

      {/* Filters Toolbar */}
      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        topicId={topicId}
        onApply={handleFiltersChange}
      />

      {/* Hero Section - Main Competitive Position */}
      {battlefieldData && (
        <CompetitiveHero data={battlefieldData} isLoading={isLoading} />
      )}

      {/* Battle KPIs - 4 Key Metrics */}
      {battlefieldData && momentumData && (
        <BattleKPIs
          battlefieldData={battlefieldData}
          momentumData={momentumData}
          visibilityScore={visibilityScore}
          isLoading={isLoading}
        />
      )}

      {/* Competitive Battlefield - Race Chart */}
      {battlefieldData && (
        <CompetitiveBattlefield data={battlefieldData} isLoading={isLoading} />
      )}

      {/* Battle Report */}
      {weeklyReportData && (
        <WeeklyBattleReport
          data={weeklyReportData}
          brandName={brandName}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
