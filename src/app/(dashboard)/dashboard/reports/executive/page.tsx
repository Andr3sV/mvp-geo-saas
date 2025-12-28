"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";

// Executive Dashboard Components
import { CompetitiveHero } from "@/components/executive/competitive-hero";
import { BattleKPIs } from "@/components/executive/battle-kpis";
import { CompetitiveBattlefield } from "@/components/executive/competitive-battlefield";
import { WeeklyBattleReport } from "@/components/executive/weekly-battle-report";
import { WelcomeTip } from "@/components/dashboard/welcome-tip";

// Types and queries
import {
  type CompetitiveBattlefieldData,
  type WeeklyBattleReportData,
  type MomentumScoreData,
  getCompetitiveBattlefield,
  getWeeklyBattleReport,
  getMomentumScore,
  getVisibilityScore,
  getExecutiveBaseData,
} from "@/lib/queries/executive-overview";
import { type SentimentFilterOptions } from "@/lib/queries/sentiment-analysis";

export default function ExecutiveOverviewPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Filter states - default to current week (Monday to today)
  const [dateRange, setDateRange] = useState<DateRangeValue>(getCurrentWeekDateRange());
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

  // Load data with phased loading
  const loadData = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    setIsLoadingReport(false);

    try {
      // PHASE 1: Load Critical Data (Hero + KPIs)
      // Load base data once to avoid redundant queries
      const baseData = await getExecutiveBaseData(selectedProjectId, filtersPayload);

      // Load critical data in parallel using base data
      const [battlefield, momentum, visibility] = await Promise.all([
        getCompetitiveBattlefield(selectedProjectId, filtersPayload, baseData),
        getMomentumScore(selectedProjectId, filtersPayload, baseData),
        getVisibilityScore(selectedProjectId, filtersPayload, baseData),
      ]);

      setBattlefieldData(battlefield);
      setMomentumData(momentum);
      setVisibilityScore(visibility);
      setIsLoading(false); // Hero and KPIs are ready

      // Set brand name from battlefield data
      if (battlefield?.brand) {
        setBrandName(battlefield.brand.name);
      }

      // PHASE 2: Charts are already ready (they use battlefieldData)
      // No additional loading needed

      // PHASE 3: Load Secondary Data (Report) - asynchronously
      setIsLoadingReport(true);
      getWeeklyBattleReport(selectedProjectId, filtersPayload, baseData)
        .then((report) => {
          setWeeklyReportData(report);
          setIsLoadingReport(false);
        })
        .catch((error) => {
          console.error("Error loading weekly report:", error);
          setIsLoadingReport(false);
        });
    } catch (error) {
      console.error("Failed to load executive metrics:", error);
      setIsLoading(false);
      setIsLoadingReport(false);
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

  // No early return - use skeleton loaders instead

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

      {/* Welcome Tip */}
      <WelcomeTip id="executive-overview">
        <span className="block mb-2">
          Your executive view to understand at a glance how your brand performs in the AI ecosystem compared to competitors.
        </span>
        <ul className="space-y-1 text-xs">
          <li><strong>🏆 Competitive Position</strong> — Quick snapshot of your market standing</li>
          <li><strong>📊 4 Key KPIs</strong> — Share of Mentions, Citations, Momentum Score &amp; AI Visibility Index</li>
          <li><strong>🏁 Competitive Battlefield</strong> — Race chart visualizing your position vs competitors</li>
          <li><strong>📋 Weekly Battle Report</strong> — Insights and trends for the selected period</li>
        </ul>
      </WelcomeTip>

      {/* Hero Section - Main Competitive Position */}
      <CompetitiveHero data={battlefieldData} isLoading={!battlefieldData} />

      {/* Battle KPIs - 4 Key Metrics */}
      <BattleKPIs
        battlefieldData={battlefieldData}
        momentumData={momentumData}
        visibilityScore={visibilityScore}
        isLoading={!battlefieldData || !momentumData}
      />

      {/* Competitive Battlefield - Race Chart */}
      <CompetitiveBattlefield data={battlefieldData} isLoading={!battlefieldData} />

      {/* Battle Report */}
      <WeeklyBattleReport
        data={weeklyReportData}
        brandName={brandName}
        isLoading={!weeklyReportData || isLoadingReport}
      />
    </div>
  );
}
