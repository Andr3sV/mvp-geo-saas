"use client";

import { useState, useEffect } from "react";
import { startOfWeek } from "date-fns";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { ResponsesTable } from "@/components/responses/responses-table";
import { DateRangeValue } from "@/components/ui/date-range-picker";

// Get yesterday's date (end of day is yesterday, not today, since today's data won't be available until tomorrow)
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  return yesterday;
}

export default function AIResponsesPage() {
  // Date range state (default to current week - Monday to yesterday)
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    from: (() => {
      const date = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      date.setHours(0, 0, 0, 0);
      return date;
    })(),
    to: getYesterday(),
  });

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
    topicId: string;
  }) => {
    if (filters.dateRange.from && filters.dateRange.to) {
      setDateRange(filters.dateRange);
    }
    setPlatform(filters.platform);
    setRegion(filters.region);
    setTopicId(filters.topicId);
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
