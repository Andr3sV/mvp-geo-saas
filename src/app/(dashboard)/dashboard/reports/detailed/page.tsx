"use client";

import { useState, useEffect, useRef } from "react";
import { useProject } from "@/contexts/project-context";
import { usePathname, useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { PeriodSelector, type ReportPeriod } from "@/components/reports/period-selector";
import { TopicSelector, type TopicSelection } from "@/components/reports/topic-selector";
import { ReportSection } from "@/components/reports/report-section";
import { NewCompetitorsSection } from "@/components/reports/new-competitors-section";
import { AttributesSection } from "@/components/reports/attributes-section";
import { ReportsList, type SavedReport } from "@/components/reports/reports-list";
import { getDetailedReportData } from "@/lib/queries/detailed-report";
import { generateSectionInsights } from "@/lib/actions/insights";
import { getProjectTopics } from "@/lib/actions/topics";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Share2, Download, Check, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  "yesterday": "yesterday",
  "last-week": "the last week",
  "last-month": "the last month",
  "last-3-months": "the last 3 months",
};

/**
 * Calculate the actual date range for a report based on when it was created and its period
 */
function getReportDateRange(createdAt: string, period: ReportPeriod): { from: Date; to: Date } {
  const createdDate = new Date(createdAt);
  const reportEndDate = endOfDay(subDays(createdDate, 1)); // Report ends the day before creation
  
  let reportStartDate: Date;
  
  switch (period) {
    case "yesterday":
      reportStartDate = startOfDay(reportEndDate);
      break;
    case "last-week":
      reportStartDate = startOfDay(subDays(reportEndDate, 6)); // 7 days total (including end date)
      break;
    case "last-month":
      reportStartDate = startOfDay(subDays(reportEndDate, 29)); // 30 days total
      break;
    case "last-3-months":
      reportStartDate = startOfDay(subDays(reportEndDate, 89)); // 90 days total
      break;
    default:
      reportStartDate = startOfDay(reportEndDate);
  }
  
  return { from: reportStartDate, to: reportEndDate };
}

/**
 * Format date range for display
 */
function formatDateRange(createdAt: string, period: ReportPeriod): string {
  const { from, to } = getReportDateRange(createdAt, period);
  
  // If it's a single day (yesterday)
  if (period === "yesterday") {
    return format(from, "MMM dd, yyyy");
  }
  
  // If same month and year, show: "MMM dd - dd, yyyy"
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${format(from, "MMM dd")} - ${format(to, "dd, yyyy")}`;
  }
  
  // If same year but different months: "MMM dd - MMM dd, yyyy"
  if (from.getFullYear() === to.getFullYear()) {
    return `${format(from, "MMM dd")} - ${format(to, "MMM dd, yyyy")}`;
  }
  
  // Different years: "MMM dd, yyyy - MMM dd, yyyy"
  return `${format(from, "MMM dd, yyyy")} - ${format(to, "MMM dd, yyyy")}`;
}

type ViewMode = "list" | "create" | "view";

export default function DetailedReportPage() {
  const { selectedProjectId } = useProject();
  const pathname = usePathname();
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicSelection>(null);
  const [topics, setTopics] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [insights, setInsights] = useState<{
    visibility: string;
    shareOfVoice: string;
    sentiment: string;
  } | null>(null);
  const [brandName, setBrandName] = useState("");
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(null);

  // Fetch brand name, topics, and reports
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

      // Fetch saved reports
      const fetchReports = async () => {
        setIsLoadingReports(true);
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("reports")
            .select("id, period, topic_name, created_at, created_by")
            .eq("project_id", selectedProjectId)
            .order("created_at", { ascending: false })
            .limit(50);

          if (error) {
            console.error("Error fetching reports:", error);
            // Table might not exist yet, use empty array
            setSavedReports([]);
          } else {
            setSavedReports(
              (data || []).map((r) => ({
                id: r.id,
                period: r.period as ReportPeriod,
                topicName: r.topic_name,
                createdAt: r.created_at,
                createdBy: r.created_by,
              }))
            );
          }
        } catch (error) {
          console.error("Error fetching reports:", error);
          setSavedReports([]);
        } finally {
          setIsLoadingReports(false);
        }
      };
      fetchReports();
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

      const generatedInsights = {
        visibility: visibilityInsight,
        shareOfVoice: sovInsight,
        sentiment: sentimentInsight,
      };

      setInsights(generatedInsights);

      // Save report to database
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData?.user) {
          const topicName = selectedTopic
            ? topics.find((t) => t.id === selectedTopic)?.name || null
            : null;

          const { data: savedReport, error: saveError } = await supabase.from("reports").insert({
            project_id: selectedProjectId,
            period: selectedPeriod,
            topic_id: selectedTopic || null,
            topic_name: topicName,
            created_by: userData.user.id,
            report_data: data,
            insights: generatedInsights,
          }).select("id, created_at").single();

          if (saveError) {
            console.error("Error saving report:", saveError);
            // Don't show error to user, report was generated successfully
            // Still show the report even if save fails
            setReportCreatedAt(new Date().toISOString());
            setViewMode("view");
            toast.success("Report generated successfully");
          } else if (savedReport) {
            // Set the report ID so we can share it
            setSelectedReportId(savedReport.id);
            setReportCreatedAt(savedReport.created_at);
            
            // Refresh reports list
            const { data: reportsData } = await supabase
              .from("reports")
              .select("id, period, topic_name, created_at, created_by")
              .eq("project_id", selectedProjectId)
              .order("created_at", { ascending: false })
              .limit(50);

            if (reportsData) {
              setSavedReports(
                reportsData.map((r) => ({
                  id: r.id,
                  period: r.period as ReportPeriod,
                  topicName: r.topic_name,
                  createdAt: r.created_at,
                  createdBy: r.created_by,
                }))
              );
            }

            // Navigate to the report detail page
            router.push(`/dashboard/reports/${savedReport.id}`);
            toast.success("Report generated successfully");
            return; // Exit early since we're navigating
          }
        }
      } catch (saveError) {
        console.error("Error saving report:", saveError);
        // Continue even if save fails - still show the report
        setReportCreatedAt(new Date().toISOString());
        setViewMode("view");
        toast.success("Report generated successfully");
      }
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

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedPeriod(null);
    setSelectedTopic(null);
    setReportData(null);
    setInsights(null);
    setSelectedReportId(null);
  };

  const handleCreateNew = () => {
    setViewMode("create");
    setSelectedPeriod(null);
    setSelectedTopic(null);
    setReportData(null);
    setInsights(null);
    setSelectedReportId(null);
  };

  const handleViewReport = async (reportId: string) => {
    // Navigate to the report detail page
    router.push(`/dashboard/reports/${reportId}`);
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("reports").delete().eq("id", reportId);

      if (error) {
        toast.error("Failed to delete report");
        return;
      }

      // Remove from local state
      setSavedReports((reports) => reports.filter((r) => r.id !== reportId));
      toast.success("Report deleted successfully");

      // If we're viewing this report, go back to list
      if (selectedReportId === reportId) {
        handleBackToList();
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    }
  };

  const handlePeriodSelected = (period: ReportPeriod) => {
    setSelectedPeriod(period);
    // Initialize topic selection to "All" (null) when period is selected
    if (selectedTopic === null || selectedTopic === undefined) {
      setSelectedTopic(null);
    }
  };

  const handleShareReport = async () => {
    if (!selectedReportId) {
      toast.error("Report not yet saved. Please wait...");
      return;
    }

    try {
      // Build the shareable URL with the report ID
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/dashboard/reports/${selectedReportId}`;

      // Copy to clipboard directly
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Report link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error: any) {
      console.error("Error copying link:", error);
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    setIsGeneratingPDF(true);
    try {
      // Dynamically import html2pdf.js (client-side only)
      const html2pdf = (await import("html2pdf.js")).default;

      const element = reportRef.current;
      const periodLabel = selectedPeriod ? PERIOD_LABELS[selectedPeriod].replace("the ", "") : "all";
      const topicLabel = selectedTopic ? topics.find(t => t.id === selectedTopic)?.name || "all" : "all";
      const filename = `detailed-report-${brandName}-${periodLabel}-${topicLabel}-${new Date().toISOString().split("T")[0]}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff"
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt as any).from(element).save();
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reports & Insights"
          description="Comprehensive analysis with in-depth metrics and breakdowns"
        />
        <Card className="p-6">
          <p className="text-muted-foreground">Please select a project first.</p>
        </Card>
      </div>
    );
  }

  // Show reports list if in list mode
  if (viewMode === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <div className="flex items-baseline gap-2 flex-1 min-w-0">
            <PageHeader
              title="Reports & Insights"
              description="View and manage your detailed reports"
            />
          </div>
          <div className="flex-shrink-0">
            <Button onClick={handleCreateNew} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Report
            </Button>
          </div>
        </div>
        <ReportsList
          reports={savedReports}
          onCreateNew={handleCreateNew}
          onViewReport={handleViewReport}
          onDeleteReport={handleDeleteReport}
          isLoading={isLoadingReports}
        />
      </div>
    );
  }

  // Show period selector if no period selected
  if (!selectedPeriod) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reports & Insights"
          description="Comprehensive analysis with in-depth metrics and breakdowns"
        />
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
        </div>
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
          title="Reports & Insights"
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
        description={
          reportCreatedAt && selectedPeriod
            ? formatDateRange(reportCreatedAt, selectedPeriod)
            : `Detailed report for ${PERIOD_LABELS[selectedPeriod]}`
        }
      />

      <div className="flex items-center justify-between gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToList}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareReport}
            className="gap-2"
            title="Share Report"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || isLoading}
            className="gap-2"
            title="Download PDF"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Generating report...</p>
          </div>
        </Card>
      ) : (
        <Card 
          ref={reportRef} 
          className="border-0 shadow-lg bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden"
        >
          {/* Report Header */}
          <div className="border-b bg-muted/30 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{brandName}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {reportCreatedAt && selectedPeriod
                    ? formatDateRange(reportCreatedAt, selectedPeriod)
                    : PERIOD_LABELS[selectedPeriod]}
                  {selectedTopic && topics.find(t => t.id === selectedTopic) && (
                    <span className="ml-2">
                      • {topics.find(t => t.id === selectedTopic)?.name}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Generated</p>
                <p className="text-sm font-medium">
                  {reportCreatedAt
                    ? format(new Date(reportCreatedAt), "MMM dd, yyyy")
                    : new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                </p>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-8 space-y-8">
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
        </Card>
      )}
    </div>
  );
}
