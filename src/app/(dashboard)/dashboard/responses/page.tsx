"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { ResponsesTable } from "@/components/responses/responses-table";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";

export default function AIResponsesPage() {
  // Date range state (default to current week - Monday to today)
  const [dateRange, setDateRange] = useState<DateRangeValue>(getCurrentWeekDateRange());

  // Platform filter state
  const [platform, setPlatform] = useState<string>("all");

  // Region filter state
  const [region, setRegion] = useState<string>("GLOBAL");

  // Topic filter state
  const [topicId, setTopicId] = useState<string>("all");

  const handleFiltersChange = (filters: {
    dateRange: DateRangeValue;
    platform: string;
    region: string;
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

  return (
    <div className="flex flex-col gap-6 p-8">
      <PageHeader
        title="AI Responses"
        description="Explore all AI-generated responses and their analysis."
      />

      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        topicId={topicId}
        onApply={handleFiltersChange}
      />

      <ResponsesTable
        dateRange={dateRange}
        platform={platform}
        region={region}
        topicId={topicId}
      />
    </div>
  );
}

