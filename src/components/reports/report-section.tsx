"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CompetitorBarChart } from "./competitor-bar-chart";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompetitorMetric, ReportSectionData } from "@/lib/queries/detailed-report";

interface ReportSectionProps {
  title: string;
  data: ReportSectionData;
  brandName: string;
  insight: string;
  isLoading?: boolean;
  valueFormat?: "number" | "percentage" | "decimal";
}

export function ReportSection({
  title,
  data,
  brandName,
  insight,
  isLoading = false,
  valueFormat,
}: ReportSectionProps) {
  const brandChange = data.brandPercentageChange;
  const ChangeIcon = brandChange > 0 ? TrendingUp : brandChange < 0 ? TrendingDown : Minus;
  const changeColor =
    brandChange > 0 ? "text-green-600" : brandChange < 0 ? "text-red-600" : "text-gray-600";

  // Auto-detect format if not provided
  const detectedFormat = valueFormat || (title === "Share of Voice" || title === "Sentiment" ? "percentage" : "number");

  // Format brand value based on section type
  const formatValue = (value: number) => {
    if (detectedFormat === "percentage") {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  return (
    <Card className="w-full border-0 shadow-sm">
      <CardContent className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Insights */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight mb-6">{title}</h3>
              <div className="space-y-4">
                <div className="flex items-baseline gap-3 pb-4 border-b">
                  <span className="text-sm font-medium text-muted-foreground">{brandName}:</span>
                  <span className="text-2xl font-bold">{formatValue(data.brandValue)}</span>
                  {Math.abs(brandChange) > 0.01 && (
                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium", 
                      brandChange > 0 ? "bg-green-50 text-green-700" : 
                      brandChange < 0 ? "bg-red-50 text-red-700" : 
                      "bg-gray-50 text-gray-700"
                    )}>
                      <ChangeIcon className="h-3.5 w-3.5" />
                      <span>{Math.abs(brandChange).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {insight || "Generating insights..."}
                </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Chart */}
          <div className="flex items-center justify-center bg-muted/30 rounded-lg p-6">
            <div className="w-full h-[420px]">
              <CompetitorBarChart
                data={data.topCompetitors}
                brandValue={data.brandValue}
                brandName={brandName}
                isLoading={isLoading}
                valueFormat={detectedFormat}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

