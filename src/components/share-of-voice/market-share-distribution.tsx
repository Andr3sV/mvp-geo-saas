"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TrendingUp, TrendingDown, Crown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Entity {
  id: string;
  name: string;
  domain: string;
  color?: string;
  mentions: number;
  percentage: number;
  isBrand: boolean;
  trend: number;
}

interface MarketShareDistributionProps {
  entities: Entity[];
  isLoading?: boolean;
  metricLabel?: string; // "mentions" or "citations"
}

// Subtle color palette
const COLORS = [
  "bg-blue-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-orange-500",
];

export function MarketShareDistribution({ entities, isLoading, metricLabel = "mentions" }: MarketShareDistributionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Market Share Distribution
          </CardTitle>
          <CardDescription>Percentage of {metricLabel} across all tracked brands</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-muted" />
                    <div className="h-4 bg-muted rounded w-24" />
                  </div>
                  <div className="h-4 bg-muted rounded w-12" />
                </div>
                <div className="h-2 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entities.length === 0 || (entities.length === 1 && entities[0].mentions === 0)) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Market Share Distribution
          </CardTitle>
          <CardDescription>Percentage of {metricLabel} across all tracked brands</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No data available yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Run some analyses to see share distribution
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxPercentage = Math.max(...entities.map(e => e.percentage));
  const totalMetrics = entities.reduce((sum, e) => sum + e.mentions, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Market Share Distribution
            </CardTitle>
            <CardDescription>Percentage of {metricLabel} across all tracked brands</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">{totalMetrics.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">total {metricLabel}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        {entities.map((entity, index) => {
          const barWidth = maxPercentage > 0 ? (entity.percentage / maxPercentage) * 100 : 0;
          const isLeader = index === 0;
          // Use entity color if available, otherwise fallback to default colors
          const entityColor = entity.color || (entity.isBrand ? "#3B82F6" : undefined);
          const colorClass = entity.isBrand && !entityColor 
            ? "bg-primary" 
            : entityColor 
            ? "" // Will use inline style
            : COLORS[index % COLORS.length];

          return (
            <div
              key={entity.id}
              className={cn(
                "group relative py-3 px-3 -mx-3 rounded-lg transition-colors",
                "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Rank number */}
                <span className={cn(
                  "w-5 text-sm font-medium tabular-nums",
                  isLeader ? "text-amber-500" : "text-muted-foreground"
                )}>
                  {index + 1}
                </span>

                {/* Logo */}
                <div className="relative flex-shrink-0">
                  <BrandLogo
                    domain={entity.domain || entity.name}
                    name={entity.name}
                    size={20}
                  />
                  {isLeader && (
                    <Crown className="absolute -top-1.5 -right-1.5 h-3 w-3 text-amber-500" />
                  )}
                </div>

                {/* Name and bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      entity.isBrand && "text-primary"
                    )}>
                      {entity.name}
                    </span>
                    {entity.isBrand && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary">
                        You
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        colorClass
                      )}
                      style={{ 
                        width: `${barWidth}%`,
                        ...(entityColor && !colorClass ? { backgroundColor: entityColor } : {}),
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Trend */}
                  {entity.trend !== 0 && (
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs font-medium",
                      entity.trend > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {entity.trend > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{Math.abs(entity.trend)}%</span>
                    </div>
                  )}

                  {/* Mentions */}
                  <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                    {entity.mentions.toLocaleString()}
                  </span>

                  {/* Percentage */}
                  <span className={cn(
                    "w-14 text-right text-sm font-semibold tabular-nums",
                    entity.isBrand && "text-primary"
                  )}>
                    {entity.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
