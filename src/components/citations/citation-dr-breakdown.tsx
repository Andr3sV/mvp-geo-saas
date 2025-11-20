"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, TrendingUp, AlertCircle, HelpCircle } from "lucide-react";

interface DRBreakdownData {
  high: number;
  medium: number;
  low: number;
  unverified: number;
}

interface CitationDRBreakdownProps {
  data: DRBreakdownData;
}

const TIERS = [
  {
    key: "high" as const,
    label: "High Authority",
    range: "80-100",
    color: "bg-emerald-500",
    gradient: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-900",
    textColor: "text-emerald-700 dark:text-emerald-300",
    icon: Award,
  },
  {
    key: "medium" as const,
    label: "Medium Authority",
    range: "60-79",
    color: "bg-blue-500",
    gradient: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-900",
    textColor: "text-blue-700 dark:text-blue-300",
    icon: TrendingUp,
  },
  {
    key: "low" as const,
    label: "Low Authority",
    range: "40-59",
    color: "bg-amber-500",
    gradient: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-900",
    textColor: "text-amber-700 dark:text-amber-300",
    icon: AlertCircle,
  },
  {
    key: "unverified" as const,
    label: "Unverified",
    range: "<40",
    color: "bg-gray-400",
    gradient: "from-gray-400 to-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
    borderColor: "border-gray-200 dark:border-gray-900",
    textColor: "text-gray-700 dark:text-gray-300",
    icon: HelpCircle,
  },
];

export function CitationDRBreakdown({ data }: CitationDRBreakdownProps) {
  const total = data.high + data.medium + data.low + data.unverified;

  const breakdown = TIERS.map((tier) => {
    const value = data[tier.key];
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return {
      ...tier,
      value,
      percentage,
    };
  }).filter((item) => item.value > 0);

  // Sort by percentage descending for visual impact
  const sortedBreakdown = [...breakdown].sort((a, b) => b.percentage - a.percentage);
  const maxPercentage = sortedBreakdown[0]?.percentage || 100;

  return (
    <Card className="border-border/50 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Citation DR Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution by source authority level
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Vertical Bar Chart */}
        <div className="flex-1 flex items-end justify-between gap-3 min-h-[280px] pb-2">
          {sortedBreakdown.map((tier) => {
            const Icon = tier.icon;
            const barHeight = (tier.percentage / maxPercentage) * 100;
            
            return (
              <div
                key={tier.key}
                className="flex-1 flex flex-col items-center justify-end gap-2 h-full group"
              >
                {/* Bar Container */}
                <div className="relative w-full flex flex-col items-center justify-end h-full min-h-[200px]">
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-lg bg-gradient-to-t ${tier.gradient} transition-all duration-700 ease-out relative overflow-hidden group-hover:opacity-90`}
                    style={{ height: `${barHeight}%`, minHeight: tier.value > 0 ? "24px" : "0" }}
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Value inside bar (if tall enough) */}
                    {barHeight > 25 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-sm drop-shadow-lg">
                          {tier.percentage.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Value below bar (if bar is too short) */}
                  {barHeight <= 25 && (
                    <div className={`absolute -top-6 ${tier.textColor}`}>
                      <span className="font-bold text-lg">
                        {tier.percentage.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Label Section */}
                <div className="w-full space-y-1.5 pt-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${tier.textColor}`} />
                    <span className={`text-xs font-semibold ${tier.textColor} text-center`}>
                      {tier.label}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {tier.range} DR
                    </p>
                    <p className="text-xs font-medium text-foreground mt-0.5">
                      {tier.value} {tier.value === 1 ? "citation" : "citations"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Summary */}
        <div className="pt-4 mt-auto border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Citations</span>
            <span className="text-lg font-bold">{total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

