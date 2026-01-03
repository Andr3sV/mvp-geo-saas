"use client";

import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/project-context";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { BattlefieldMatrix } from "@/components/citations/battlefield-matrix";
import { MarketPositioningMatrix } from "@/components/citations/market-positioning-matrix";
import { CompetitiveBattlefield } from "@/components/executive/competitive-battlefield";
import { getBattlefieldMatrixData } from "@/lib/queries/battlefield-matrix";
import { getMarketPositioningData } from "@/lib/queries/market-positioning";
import { type CompetitiveBattlefieldData, getCompetitiveBattlefield, getExecutiveBaseData } from "@/lib/queries/executive-overview";
import { WelcomeTip } from "@/components/dashboard/welcome-tip";
import { type SentimentFilterOptions } from "@/lib/queries/sentiment-analysis";

export default function BattlefieldPage() {
  const { selectedProjectId } = useProject();
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRangeValue>(getCurrentWeekDateRange());
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("GLOBAL");
  
  // Battlefield matrix data
  const [battlefieldMatrixData, setBattlefieldMatrixData] = useState<any[]>([]);
  const [battlefieldTopics, setBattlefieldTopics] = useState<any[]>([]);
  const [isLoadingBattlefield, setIsLoadingBattlefield] = useState(false);
  
  // Market positioning matrix data
  const [marketPositioningData, setMarketPositioningData] = useState<any[]>([]);
  const [isLoadingMarketPositioning, setIsLoadingMarketPositioning] = useState(false);

  // Competitive Battlefield data
  const [competitiveBattlefieldData, setCompetitiveBattlefieldData] = useState<CompetitiveBattlefieldData | null>(null);
  const [isLoadingCompetitiveBattlefield, setIsLoadingCompetitiveBattlefield] = useState(false);

  const loadBattlefieldMatrix = useCallback(async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    setIsLoadingBattlefield(true);
    try {
      const matrixData = await getBattlefieldMatrixData(
        selectedProjectId,
        dateRange.from,
        dateRange.to,
        platform !== "all" ? platform : undefined,
        region !== "GLOBAL" ? region : undefined
      );

      // Extract unique topics
      const topicsMap = new Map<string, { id: string; name: string; color?: string }>();
      matrixData.forEach((data) => {
        if (!topicsMap.has(data.topicId)) {
          topicsMap.set(data.topicId, {
            id: data.topicId,
            name: data.topicName,
            color: data.topicColor,
          });
        }
      });

      setBattlefieldTopics(Array.from(topicsMap.values()));
      setBattlefieldMatrixData(matrixData);
    } catch (error) {
      console.error("Error loading battlefield matrix:", error);
    } finally {
      setIsLoadingBattlefield(false);
    }
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region]);

  const loadMarketPositioning = useCallback(async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    setIsLoadingMarketPositioning(true);
    try {
      const filtersPayload: SentimentFilterOptions = {
        dateRange: { from: dateRange.from, to: dateRange.to },
        platform: platform !== "all" ? platform : undefined,
        region: region !== "GLOBAL" ? region : undefined,
      };

      const positioningData = await getMarketPositioningData(selectedProjectId, filtersPayload);
      setMarketPositioningData(positioningData);
    } catch (error) {
      console.error("Error loading market positioning:", error);
    } finally {
      setIsLoadingMarketPositioning(false);
    }
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region]);

  const loadCompetitiveBattlefield = useCallback(async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    setIsLoadingCompetitiveBattlefield(true);
    try {
      const filtersPayload: SentimentFilterOptions = {
        dateRange: { from: dateRange.from, to: dateRange.to },
        platform: platform !== "all" ? platform : undefined,
        region: region !== "GLOBAL" ? region : undefined,
      };
      const baseData = await getExecutiveBaseData(selectedProjectId, filtersPayload);
      const battlefield = await getCompetitiveBattlefield(selectedProjectId, filtersPayload, baseData);
      setCompetitiveBattlefieldData(battlefield);
    } catch (error) {
      console.error("Error loading competitive battlefield:", error);
    } finally {
      setIsLoadingCompetitiveBattlefield(false);
    }
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region]);

  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadBattlefieldMatrix();
      loadMarketPositioning();
      loadCompetitiveBattlefield();
    }
  }, [loadBattlefieldMatrix, loadMarketPositioning, loadCompetitiveBattlefield]);

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
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Battlefield"
        description="Share of mentions by topic across all brands"
      />

      <FiltersToolbar 
        dateRange={dateRange}
        platform={platform}
        region={region}
        hideTopicFilter={true}
        onApply={handleFiltersChange} 
      />

      {/* Definition Tip */}
      <WelcomeTip id="what-is-battlefield">
        <strong>⚔️ What is Battlefield?</strong> — A competitive matrix showing how each brand performs across different topics. See where you're leading, where competitors dominate, and identify opportunities to expand your share of voice.
      </WelcomeTip>

      {/* Market Positioning Matrix */}
      <MarketPositioningMatrix
        data={marketPositioningData}
        isLoading={isLoadingMarketPositioning}
      />

      {/* Battlefield Matrix */}
      <BattlefieldMatrix
        topics={battlefieldTopics}
        brandData={battlefieldMatrixData}
        isLoading={isLoadingBattlefield}
      />

      {/* Competitive Battlefield */}
      <CompetitiveBattlefield 
        data={competitiveBattlefieldData} 
        isLoading={isLoadingCompetitiveBattlefield} 
      />
    </div>
  );
}

