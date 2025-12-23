"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { HighValueOpportunitiesTable } from "@/components/citations/high-value-opportunities-table";
import { UnmentionedSourcesTable } from "@/components/citations/unmentioned-sources-table";
import { getHighValueOpportunities, getUnmentionedSources } from "@/lib/queries/citations-real";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";

export default function OpportunitiesPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [unmentionedSources, setUnmentionedSources] = useState<any[]>([]);

  // Date range state (default to current week - Monday to today)
  const [dateRange, setDateRange] = useState<DateRangeValue>(getCurrentWeekDateRange());
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("GLOBAL");

  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadOpportunities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region]);

  const loadOpportunities = async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    setIsLoading(true);

    const filtersPayload = {
      fromDate: dateRange.from,
      toDate: dateRange.to,
      platform,
      region,
    };

    try {
      console.log("🔍 Loading opportunities with filters:", {
        projectId: selectedProjectId,
        filters: filtersPayload,
      });

      const [opportunitiesResult, unmentionedResult] = await Promise.all([
        getHighValueOpportunities(
          selectedProjectId,
          100, // Get more opportunities for the dedicated page
          filtersPayload
        ),
        getUnmentionedSources(
          selectedProjectId,
          100, // Get more unmentioned sources for the dedicated page
          filtersPayload
        ),
      ]);

      console.log("✅ Opportunities result:", {
        count: Array.isArray(opportunitiesResult) ? opportunitiesResult.length : 0,
        sample: Array.isArray(opportunitiesResult) && opportunitiesResult.length > 0 ? opportunitiesResult[0] : null,
      });

      console.log("✅ Unmentioned sources result:", {
        count: Array.isArray(unmentionedResult) ? unmentionedResult.length : 0,
        sample: Array.isArray(unmentionedResult) && unmentionedResult.length > 0 ? unmentionedResult[0] : null,
      });

      // The functions return arrays directly, not { error, data }
      setOpportunities(Array.isArray(opportunitiesResult) ? opportunitiesResult : []);
      setUnmentionedSources(Array.isArray(unmentionedResult) ? unmentionedResult : []);
    } catch (error) {
      console.error("❌ Error loading opportunities:", error);
      setOpportunities([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="High value sources"
          description="High-value domains where competitors are cited but you're not"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="High value sources"
        description="High-value domains where competitors are cited but you're not - prime outreach targets"
      />

      {/* Filters Toolbar */}
      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        onApply={handleFiltersChange}
      />

      {/* High Value Opportunities Table */}
      <HighValueOpportunitiesTable data={opportunities} />

      {/* Unmentioned Sources Table */}
      <UnmentionedSourcesTable data={unmentionedSources} />
    </div>
  );
}

