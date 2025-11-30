"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";
import { toast } from "sonner";

// Sentiment Analysis Components
import { EntitySentimentTable } from "@/components/sentiment/entity-sentiment-table";
import { AttributeBreakdown } from "@/components/sentiment/attribute-breakdown";

// Queries
import {
  getEntitySentiments,
  getAttributeBreakdown,
  SentimentFilterOptions,
  EntitySentiment,
} from "@/lib/queries/sentiment-analysis";

export default function AttributesPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("GLOBAL");

  // Data states
  const [entities, setEntities] = useState<EntitySentiment[]>([]);
  const [attributes, setAttributes] = useState<any>(null);

  // Create filters object
  const filtersPayload: SentimentFilterOptions = {
    dateRange: dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined,
    platform: platform !== "all" ? platform : undefined,
    region: region !== "GLOBAL" ? region : undefined,
  };

  // Load attributes data
  const loadAttributesData = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    try {
      const [entitiesData, attributesData] = await Promise.all([
        getEntitySentiments(selectedProjectId, filtersPayload),
        getAttributeBreakdown(selectedProjectId, filtersPayload),
      ]);

      console.log('👥 Entities:', entitiesData?.length);
      console.log('🏷️ Attributes:', attributesData);

      setEntities(entitiesData);
      setAttributes(attributesData);
    } catch (error: any) {
      console.error("Failed to load attributes data:", error);
      toast.error("Failed to load attributes data");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when project or filters change
  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadAttributesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region]);

  // Handle filters change
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
          title="Attributes"
          description="Entity sentiment analysis and attribute breakdown"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading attributes data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attributes"
        description="Entity sentiment analysis and attribute breakdown"
      />

      {/* Filters Toolbar */}
      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        onApply={handleFiltersChange}
      />

      {/* Entity Sentiment Analysis */}
      <EntitySentimentTable
        entities={entities}
        isLoading={isLoading}
      />

      {/* Attribute Analysis */}
      <AttributeBreakdown
        brandAttributes={attributes?.brandAttributes || []}
        competitorAttributes={attributes?.competitorAttributes || []}
        isLoading={isLoading}
        detailed={true}
      />
    </div>
  );
}

