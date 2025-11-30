"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { PeriodSelector, type ReportPeriod } from "@/components/reports/period-selector";
import { TopicSelector, type TopicSelection } from "@/components/reports/topic-selector";
import { ReportSection } from "@/components/reports/report-section";
import { NewCompetitorsSection } from "@/components/reports/new-competitors-section";
import { AttributesSection } from "@/components/reports/attributes-section";
import { getDetailedReportData } from "@/lib/queries/detailed-report";
import { generateSectionInsights } from "@/lib/actions/insights";
import { getProjectTopics } from "@/lib/actions/topics";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  "yesterday": "yesterday",
  "last-week": "the last week",
  "last-month": "the last month",
  "last-3-months": "the last 3 months",
};

export default function DetailedReportPage() {
  const { selectedProjectId } = useProject();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicSelection>(null);
  const [topics, setTopics] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [insights, setInsights] = useState<{
    visibility: string;
    shareOfVoice: string;
    sentiment: string;
  } | null>(null);
  const [brandName, setBrandName] = useState("");

  // Fetch brand name and topics
  useEffect(() => {
    if (selectedProjectId) {
      const fetchBrandName = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("projects")
          .select("brand_name, name")
          .eq("id", selectedProjectId)
          .single();

        if (data) {
          setBrandName(data.brand_name || data.name || "Your Brand");
        }
      };
      fetchBrandName();

      // Fetch topics
      const fetchTopics = async () => {
        setIsLoadingTopics(true);
        try {
          const result = await getProjectTopics(selectedProjectId);
          if (result && !result.error) {
            setTopics(result.data || []);
          }
        } catch (error) {
          console.error("Error fetching topics:", error);
        } finally {
          setIsLoadingTopics(false);
        }
      };
      fetchTopics();
    }
  }, [selectedProjectId]);

  const handleGenerateReport = async () => {
    if (!selectedProjectId || !selectedPeriod || selectedTopic === undefined) return;

    setIsLoading(true);
    setReportData(null);
    setInsights(null);

    try {
      // Fetch report data
      const data = await getDetailedReportData(selectedProjectId, selectedPeriod);

      if (!data) {
        toast.error("Unable to fetch report data");
        setIsLoading(false);
        return;
      }

      setReportData(data);

      // Generate insights for each section
      const periodLabel = PERIOD_LABELS[selectedPeriod];
      const [visibilityInsight, sovInsight, sentimentInsight] = await Promise.all([
        generateSectionInsights("visibility", data.visibilityScore, brandName, periodLabel),
        generateSectionInsights("share-of-voice", data.shareOfVoice, brandName, periodLabel),
        generateSectionInsights("sentiment", data.sentiment, brandName, periodLabel),
      ]);

      setInsights({
        visibility: visibilityInsight,
        shareOfVoice: sovInsight,
        sentiment: sentimentInsight,
      });

      toast.success("Report generated successfully");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Error generating report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToTopicSelection = () => {
    setSelectedTopic(null);
    setReportData(null);
    setInsights(null);
  };

  const handleBackToPeriodSelection = () => {
    setSelectedPeriod(null);
    setSelectedTopic(null);
    setReportData(null);
    setInsights(null);
  };

  const handlePeriodSelected = (period: ReportPeriod) => {
    setSelectedPeriod(period);
    // Initialize topic selection to "All" (null) when period is selected
    if (selectedTopic === null || selectedTopic === undefined) {
      setSelectedTopic(null);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detailed Report"
          description="Comprehensive analysis with in-depth metrics and breakdowns"
        />
        <Card className="p-6">
          <p className="text-muted-foreground">Please select a project first.</p>
        </Card>
      </div>
    );
  }

  // Show period selector if no period selected
  if (!selectedPeriod) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detailed Report"
          description="Comprehensive analysis with in-depth metrics and breakdowns"
        />
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodSelect={handlePeriodSelected}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // Show topic selector if period selected
  if (selectedPeriod && !reportData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detailed Report"
          description="Comprehensive analysis with in-depth metrics and breakdowns"
        />
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPeriodSelection}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Change Period
          </Button>
        </div>
        <TopicSelector
          topics={topics.map((t) => ({
            id: t.id,
            name: t.name,
            color: t.color,
          }))}
          selectedTopic={selectedTopic}
          onTopicSelect={(topicId) => {
            setSelectedTopic(topicId);
          }}
          isLoading={isLoadingTopics}
        />
        <div className="flex justify-center">
          <Button
            onClick={handleGenerateReport}
            disabled={isLoading || isLoadingTopics}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Show report
  return (
    <div className="space-y-6">
      <PageHeader
        title="Detailed Report"
        description={`Detailed report for ${PERIOD_LABELS[selectedPeriod]}`}
      />

      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToTopicSelection}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Change Topic
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Generating report...</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Visibility Score */}
          <ReportSection
            title="Visibility Score"
            data={reportData.visibilityScore}
            brandName={brandName}
            insight={insights?.visibility || "Generating insights..."}
            isLoading={!insights}
          />

          {/* Section 2: Share of Voice */}
          <ReportSection
            title="Share of Voice"
            data={reportData.shareOfVoice}
            brandName={brandName}
            insight={insights?.shareOfVoice || "Generating insights..."}
            isLoading={!insights}
          />

          {/* Section 3: Sentiment */}
          <ReportSection
            title="Sentiment"
            data={reportData.sentiment}
            brandName={brandName}
            insight={insights?.sentiment || "Generating insights..."}
            isLoading={!insights}
          />

          {/* Section 4: Attributes */}
          <AttributesSection
            competitors={[]}
            brandName={brandName}
            isLoading={false}
          />

          {/* Section 5: New Competitors on Radar */}
          <NewCompetitorsSection
            competitors={reportData.newCompetitors || []}
            brandName={brandName}
            isLoading={false}
          />
        </div>
      )}
    </div>
  );
}
