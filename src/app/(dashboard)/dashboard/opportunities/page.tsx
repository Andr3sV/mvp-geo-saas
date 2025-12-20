"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { HighValueOpportunitiesTable } from "@/components/citations/high-value-opportunities-table";
import { getHighValueOpportunities } from "@/lib/queries/citations-real";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { startOfWeek } from "date-fns";

// Get yesterday's date (end of day is yesterday, not today, since today's data won't be available until tomorrow)
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  return yesterday;
}

export default function OpportunitiesPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<any[]>([]);

  // Date range state (default to current week - Monday to yesterday)
  // Today's data won't be available until tomorrow, so max date is yesterday
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

      const opportunitiesResult = await getHighValueOpportunities(
        selectedProjectId,
        100, // Get more opportunities for the dedicated page
        filtersPayload
      );

      console.log("✅ Opportunities result:", {
        count: Array.isArray(opportunitiesResult) ? opportunitiesResult.length : 0,
        sample: Array.isArray(opportunitiesResult) && opportunitiesResult.length > 0 ? opportunitiesResult[0] : null,
      });

      // The function returns an array directly, not { error, data }
      setOpportunities(Array.isArray(opportunitiesResult) ? opportunitiesResult : []);
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
    </div>
  );
}

