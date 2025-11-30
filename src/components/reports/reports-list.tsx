"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Hash, ArrowRight, Trash2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { ReportPeriod } from "./period-selector";

export interface SavedReport {
  id: string;
  period: ReportPeriod;
  topicName: string | null;
  createdAt: string;
  createdBy: string;
}

interface ReportsListProps {
  reports: SavedReport[];
  onCreateNew: () => void;
  onViewReport: (reportId: string) => void;
  onDeleteReport?: (reportId: string) => void;
  isLoading?: boolean;
}

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  "yesterday": "Yesterday",
  "last-week": "Last Week",
  "last-month": "Last Month",
  "last-3-months": "Last 3 Months",
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

export function ReportsList({
  reports,
  onCreateNew,
  onViewReport,
  onDeleteReport,
  isLoading = false,
}: ReportsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reports List */}
      {reports.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-gradient-to-br from-primary/10 to-primary/5 p-4 mb-6">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
              Create your first detailed report to get started with comprehensive insights and analytics.
            </p>
            <Button onClick={onCreateNew} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group relative overflow-hidden bg-gradient-to-br from-[#C2C2E1]/20 via-[#C2C2E1]/10 to-background"
              onClick={() => onViewReport(report.id)}
            >
              {/* Background gradients */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(194,194,225,0.3),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(194,194,225,0.2),transparent_50%)]" />
              <CardContent className="p-4 relative z-10">
                <div className="space-y-2.5">
                  {/* Header with badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      <Badge 
                        variant="secondary" 
                        className="text-xs font-semibold bg-primary/10 text-primary border-primary/20 py-0.5"
                      >
                        <Calendar className="h-3 w-3 mr-1.5" />
                        {formatDateRange(report.createdAt, report.period)}
                      </Badge>
                      
                      {report.topicName && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-background/50 text-muted-foreground border-border/50 font-medium py-0.5"
                        >
                          <Hash className="h-3 w-3 mr-1" />
                          {report.topicName}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onDeleteReport && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReport(report.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      <div className="rounded-full bg-muted p-1 group-hover:bg-primary/10 transition-colors">
                        <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Date info */}
                  <div className="pt-1.5 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(new Date(report.createdAt), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {format(new Date(report.createdAt), "HH:mm")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

