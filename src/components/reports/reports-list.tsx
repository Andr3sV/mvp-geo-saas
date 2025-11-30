"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Hash, ArrowRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
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
    <div className="space-y-4">
      {/* Create Report Button */}
      <div className="flex justify-end">
        <Button onClick={onCreateNew} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Report
        </Button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Create your first detailed report to get started with comprehensive insights and analytics.
            </p>
            <Button onClick={onCreateNew} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="border hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onViewReport(report.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                        {PERIOD_LABELS[report.period]}
                      </Badge>
                      
                      {report.topicName && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-transparent text-muted-foreground border-border font-medium"
                        >
                          <Hash className="h-3 w-3 mr-1" />
                          {report.topicName}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(report.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {onDeleteReport && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteReport(report.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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

