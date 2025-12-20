"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Star, TrendingUp, Minus, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MomentumData {
  query: string;
  volume: number;
  growth: number;
  quadrant: "star" | "rising" | "stable" | "declining";
}

interface QueryMomentumMatrixProps {
  data: MomentumData[];
  isLoading?: boolean;
}

const QUADRANT_CONFIG = {
  star: {
    label: "Stars",
    description: "High volume, high growth",
    icon: Star,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-900/50",
  },
  rising: {
    label: "Rising",
    description: "Low volume, high growth",
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-900/50",
  },
  stable: {
    label: "Stable",
    description: "Consistent performance",
    icon: Minus,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-900/50",
  },
  declining: {
    label: "Declining",
    description: "Decreasing volume",
    icon: TrendingDown,
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/20",
    borderColor: "border-rose-200 dark:border-rose-900/50",
  },
};

function QuadrantSection({ 
  quadrant, 
  items 
}: { 
  quadrant: keyof typeof QUADRANT_CONFIG; 
  items: MomentumData[];
}) {
  const config = QUADRANT_CONFIG[quadrant];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-lg border p-4", config.borderColor, config.bgColor)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-5 w-5", config.color)} />
        <div>
          <h4 className={cn("font-semibold", config.color)}>{config.label}</h4>
          <p className="text-[10px] text-muted-foreground">{config.description}</p>
        </div>
        <span className="ml-auto text-xs font-medium text-muted-foreground">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No queries</p>
      ) : (
        <div className="space-y-2 max-h-[150px] overflow-y-auto">
          {items.slice(0, 5).map((item, index) => (
            <div
              key={`${item.query}-${index}`}
              className="flex items-center justify-between bg-background/50 rounded p-2 text-xs"
            >
              <span className="truncate flex-1 pr-2" title={item.query}>
                {item.query.length > 30 ? item.query.substring(0, 30) + "..." : item.query}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-muted-foreground">{item.volume}</span>
                <span className={cn(
                  "font-medium",
                  item.growth > 0 ? "text-emerald-600" : item.growth < 0 ? "text-rose-600" : ""
                )}>
                  {item.growth > 0 ? "+" : ""}{item.growth.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
          {items.length > 5 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{items.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function QueryMomentumMatrix({ data, isLoading }: QueryMomentumMatrixProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Rocket className="h-5 w-5 text-muted-foreground" />
            Query Momentum Matrix
          </CardTitle>
          <CardDescription>Query performance by volume and growth</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Rocket className="h-5 w-5 text-muted-foreground" />
            Query Momentum Matrix
          </CardTitle>
          <CardDescription>Query performance by volume and growth</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Rocket className="h-12 w-12 opacity-50" />
            <p>No momentum data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by quadrant
  const grouped = {
    star: data.filter((d) => d.quadrant === "star"),
    rising: data.filter((d) => d.quadrant === "rising"),
    stable: data.filter((d) => d.quadrant === "stable"),
    declining: data.filter((d) => d.quadrant === "declining"),
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Rocket className="h-5 w-5 text-muted-foreground" />
              Query Momentum Matrix
            </CardTitle>
            <CardDescription>Query performance by volume and growth</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">{data.length}</p>
            <p className="text-xs text-muted-foreground">queries analyzed</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <QuadrantSection quadrant="star" items={grouped.star} />
          <QuadrantSection quadrant="rising" items={grouped.rising} />
          <QuadrantSection quadrant="stable" items={grouped.stable} />
          <QuadrantSection quadrant="declining" items={grouped.declining} />
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-600" />
            <span>Stars: High volume + growing</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-600" />
            <span>Rising: Growing fast</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
