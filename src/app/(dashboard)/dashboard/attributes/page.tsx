"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Attribute Components
import { AttributeBreakdown } from "@/components/sentiment/attribute-breakdown";
import { AttributeEvolutionTimeline } from "@/components/sentiment/attribute-evolution-timeline";

// Queries
import {
  getAttributeBreakdownFromEvaluations,
  getAttributeEvolution,
  getProjectTopics,
} from "@/lib/queries/brand-evaluations";

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
  const [selectedTopic, setSelectedTopic] = useState<string>("all");

  // Data states
  const [attributes, setAttributes] = useState<any>(null);
  const [attributeEvolutionData, setAttributeEvolutionData] = useState<any[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  // Load attributes data
  const loadAttributesData = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    try {
      // Load available topics
      const projectTopics = await getProjectTopics(selectedProjectId);
      setAvailableTopics(projectTopics.topics || []);

      const [attributesData, evolutionData] = await Promise.all([
        getAttributeBreakdownFromEvaluations(
          selectedProjectId,
          dateRange.from,
          dateRange.to
        ),
        getAttributeEvolution(
          selectedProjectId,
          selectedTopic !== "all" ? selectedTopic : undefined,
          "both",
          dateRange.from,
          dateRange.to
        ),
      ]);

      console.log('🏷️ Attributes:', attributesData);
      console.log('📈 Attribute Evolution:', evolutionData?.length);

      setAttributes(attributesData);
      setAttributeEvolutionData(evolutionData || []);
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
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region, selectedTopic]);

  // Handle filters change
  const handleFiltersChange = (filters: {
    region: string;
    dateRange: DateRangeValue;
    platform: string;
    topicId?: string;
  }) => {
    if (filters.dateRange.from && filters.dateRange.to) {
      setDateRange(filters.dateRange);
    }
    setPlatform(filters.platform);
    setRegion(filters.region);
    if (filters.topicId !== undefined) {
      setSelectedTopic(filters.topicId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Attributes"
          description="Attribute analysis from topic-based evaluations"
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
        description="Attribute analysis from topic-based evaluations using Gemini with web search"
      />

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-4">
        <FiltersToolbar
          dateRange={dateRange}
          platform={platform}
          region={region}
          topicId={selectedTopic}
          onApply={handleFiltersChange}
        />

        {/* Topic Filter for Brand Evaluations */}
        {availableTopics.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Topic (Evaluations):</label>
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {availableTopics.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Attribute Breakdown */}
      <AttributeBreakdown
        brandAttributes={attributes?.brandAttributes || []}
        competitorAttributes={attributes?.competitorAttributes || []}
        isLoading={isLoading}
        detailed={true}
      />

      {/* Attribute Evolution Timeline */}
      <AttributeEvolutionTimeline
        data={attributeEvolutionData}
        topics={availableTopics}
        isLoading={isLoading}
      />
    </div>
  );
}
