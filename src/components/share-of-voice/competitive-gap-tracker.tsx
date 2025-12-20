"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ArrowRightLeft, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Entity {
  id: string;
  name: string;
  domain: string;
  percentage: number;
  trend: number;
  mentions: number;
  isBrand: boolean;
}

interface CompetitiveGapTrackerProps {
  entities: Entity[];
  isLoading?: boolean;
  metricLabel?: string; // "mentions" or "citations"
}

export function CompetitiveGapTracker({ entities, isLoading, metricLabel = "mentions" }: CompetitiveGapTrackerProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            Competitive Gap Analysis
          </CardTitle>
          <CardDescription>Your position vs top competitors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const brand = entities.find((e) => e.isBrand);
  const competitors = entities.filter((e) => !e.isBrand);

  if (!brand || competitors.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            Competitive Gap Analysis
          </CardTitle>
          <CardDescription>Your position vs top competitors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex items-center justify-center text-muted-foreground">
            No competitor data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get top 4 competitors by mentions
  const topCompetitors = [...competitors]
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 4);

  // Find max share for bar scaling
  const allEntities = [brand, ...topCompetitors];
  const maxShare = Math.max(...allEntities.map(e => e.percentage));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          Competitive Gap Analysis
        </CardTitle>
        <CardDescription>Your position vs top {topCompetitors.length} competitors by volume</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Your brand row */}
          <div className="flex items-center gap-3 pb-3 border-b">
            <div className="w-28 flex items-center gap-2 flex-shrink-0">
              <BrandLogo domain={brand.domain || brand.name} name={brand.name} size={18} />
              <span className="text-sm font-medium text-primary truncate">{brand.name}</span>
            </div>
            <div className="flex-1">
              <div className="h-6 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${(brand.percentage / maxShare) * 100}%` }}
                >
                  <span className="text-[10px] font-semibold text-primary-foreground">
                    {brand.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="w-20 flex items-center justify-end gap-1 flex-shrink-0">
              {brand.trend !== 0 && (
                <>
                  {brand.trend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-rose-500" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    brand.trend > 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {brand.trend > 0 ? "+" : ""}{brand.trend}%
                  </span>
                </>
              )}
            </div>
            <div className="w-16 text-right flex-shrink-0">
              <span className="text-xs text-muted-foreground">{brand.mentions.toLocaleString()}</span>
            </div>
          </div>

          {/* Competitor rows */}
          {topCompetitors.map((competitor) => {
            const gap = brand.percentage - competitor.percentage;
            const trendDiff = brand.trend - competitor.trend;
            const isAhead = gap > 0;
            const gapClosing = trendDiff < -2; // Competitor growing faster significantly

            return (
              <div key={competitor.id} className="flex items-center gap-3">
                <div className="w-28 flex items-center gap-2 flex-shrink-0">
                  <BrandLogo domain={competitor.domain || competitor.name} name={competitor.name} size={18} />
                  <span className="text-sm font-medium truncate">{competitor.name}</span>
                </div>
                <div className="flex-1">
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${(competitor.percentage / maxShare) * 100}%` }}
                    >
                      <span className="text-[10px] font-semibold text-white">
                        {competitor.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-20 flex items-center justify-end gap-1 flex-shrink-0">
                  {/* Gap indicator */}
                  <span className={cn(
                    "text-xs font-semibold",
                    isAhead ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {isAhead ? "+" : ""}{gap.toFixed(1)}
                  </span>
                  {gapClosing && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" title="Gap closing" />
                  )}
                  {isAhead && !gapClosing && trendDiff > 2 && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" title="Gap widening" />
                  )}
                </div>
                <div className="w-16 text-right flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{competitor.mentions.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {topCompetitors.filter(c => brand.percentage > c.percentage).length === topCompetitors.length ? (
              <span className="text-emerald-600 font-medium">Leading all top competitors</span>
            ) : (
              <>Ahead of {topCompetitors.filter(c => brand.percentage > c.percentage).length} of {topCompetitors.length} top competitors</>
            )}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>Gap widening</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span>Gap closing</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
