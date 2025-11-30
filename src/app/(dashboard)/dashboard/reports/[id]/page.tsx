"use client";

import { useState, useEffect, useRef } from "react";
import { useProject } from "@/contexts/project-context";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReportSection } from "@/components/reports/report-section";
import { NewCompetitorsSection } from "@/components/reports/new-competitors-section";
import { AttributesSection } from "@/components/reports/attributes-section";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Share2, Download, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { ReportPeriod } from "@/components/reports/period-selector";

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

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedProjectId } = useProject();
  const reportRef = useRef<HTMLDivElement>(null);
  const reportId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [insights, setInsights] = useState<{
    visibility: string;
    shareOfVoice: string;
    sentiment: string;
  } | null>(null);
  const [brandName, setBrandName] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topics, setTopics] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId || !selectedProjectId) return;

    const loadReport = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("reports")
          .select("period, topic_id, topic_name, report_data, insights, created_at")
          .eq("id", reportId)
          .eq("project_id", selectedProjectId)
          .single();

        if (error || !data) {
          toast.error("Report not found");
          router.push("/dashboard/reports/detailed");
          return;
        }

        setSelectedPeriod(data.period as ReportPeriod);
        setSelectedTopic(data.topic_id || null);
        setReportData(data.report_data);
        setInsights(data.insights);
        setReportCreatedAt(data.created_at);

        // Fetch brand name
        const { data: projectData } = await supabase
          .from("projects")
          .select("brand_name, name")
          .eq("id", selectedProjectId)
          .single();

        if (projectData) {
          setBrandName(projectData.brand_name || projectData.name || "Your Brand");
        }

        // Fetch topics for topic name display
        const { data: topicsData } = await supabase
          .from("topics")
          .select("id, name, color")
          .eq("project_id", selectedProjectId);

        if (topicsData) {
          setTopics(topicsData);
        }
      } catch (error) {
        console.error("Error loading report:", error);
        toast.error("Error loading report");
        router.push("/dashboard/reports/detailed");
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [reportId, selectedProjectId, router]);

  const handleShareReport = async () => {
    try {
      const shareUrl = `${window.location.origin}/dashboard/reports/${reportId}`;

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
      const html2pdf = (await import("html2pdf.js")).default;
      const element = reportRef.current;
      const periodLabel = selectedPeriod || "all";
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading Report"
          description="Please wait while we load your report"
        />
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading report...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Report Not Found"
          description="The report you're looking for doesn't exist"
        />
        <Card className="p-6">
          <Button onClick={() => router.push("/dashboard/reports/detailed")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detailed Report"
        description={
          reportCreatedAt && selectedPeriod
            ? formatDateRange(reportCreatedAt, selectedPeriod)
            : "Detailed report"
        }
      />

      <div className="flex items-center justify-between gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/reports/detailed")}
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
            disabled={isGeneratingPDF}
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
                  : "Report"}
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
                  : "Unknown"}
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
    </div>
  );
}

