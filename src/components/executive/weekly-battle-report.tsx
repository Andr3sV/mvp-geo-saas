"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Link2,
  BarChart3,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyBattleReportData } from "@/lib/queries/executive-overview";

interface WeeklyBattleReportProps {
  data: WeeklyBattleReportData;
  brandName: string;
  isLoading?: boolean;
}

export function WeeklyBattleReport({ data, brandName, isLoading }: WeeklyBattleReportProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              Battle Report
            </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
                <div className="h-4 bg-muted-foreground/20 rounded w-20 mb-3" />
                <div className="h-8 bg-muted-foreground/20 rounded w-16 mb-2" />
                <div className="h-3 bg-muted-foreground/20 rounded w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getChangeIcon = (change: number, size: "sm" | "lg" = "sm") => {
    const className = size === "lg" ? "h-6 w-6" : "h-4 w-4";
    if (change > 0) return <ArrowUpRight className={cn(className, "text-emerald-500")} />;
    if (change < 0) return <ArrowDownRight className={cn(className, "text-rose-500")} />;
    return <Minus className={cn(className, "text-muted-foreground")} />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-emerald-600";
    if (change < 0) return "text-rose-600";
    return "text-muted-foreground";
  };

  const getChangeBg = (change: number) => {
    if (change > 0) return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900";
    if (change < 0) return "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900";
    return "bg-muted/50 border-muted";
  };

  // Find growing competitors
  const growingCompetitors = data.competitorChanges.filter(c => c.shareChange > 1);
  const decliningCompetitors = data.competitorChanges.filter(c => c.shareChange < -1);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              Battle Report
            </CardTitle>
            <CardDescription className="mt-1">
              Performance changes vs previous period
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Period comparison
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Metrics Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Mentions Change */}
          <div className={cn(
            "p-4 rounded-xl border transition-all",
            getChangeBg(data.mentionsChange.change)
          )}>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Mentions</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold tabular-nums">
                  {data.mentionsChange.current.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  {getChangeIcon(data.mentionsChange.change, "sm")}
                  <span className={cn("text-sm font-semibold", getChangeColor(data.mentionsChange.change))}>
                    {data.mentionsChange.change > 0 ? "+" : ""}{data.mentionsChange.change}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {data.mentionsChange.changePercent > 0 ? "+" : ""}{data.mentionsChange.changePercent}% vs last period
              ({data.mentionsChange.previous.toLocaleString()} before)
            </p>
          </div>

          {/* Citations Change */}
          <div className={cn(
            "p-4 rounded-xl border transition-all",
            getChangeBg(data.citationsChange.change)
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Citations</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold tabular-nums">
                  {data.citationsChange.current.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  {getChangeIcon(data.citationsChange.change, "sm")}
                  <span className={cn("text-sm font-semibold", getChangeColor(data.citationsChange.change))}>
                    {data.citationsChange.change > 0 ? "+" : ""}{data.citationsChange.change}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {data.citationsChange.changePercent > 0 ? "+" : ""}{data.citationsChange.changePercent}% vs last period
              ({data.citationsChange.previous.toLocaleString()} before)
            </p>
          </div>

          {/* Share Change */}
          <div className={cn(
            "p-4 rounded-xl border transition-all",
            getChangeBg(data.shareChange.change)
          )}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Market Share</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold tabular-nums">
                  {data.shareChange.current}%
                </span>
                <div className="flex items-center gap-1">
                  {getChangeIcon(data.shareChange.change, "sm")}
                  <span className={cn("text-sm font-semibold", getChangeColor(data.shareChange.change))}>
                    {data.shareChange.change > 0 ? "+" : ""}{data.shareChange.change}pp
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Was {data.shareChange.previous}% last period
            </p>
          </div>
        </div>

        {/* Highlights Section */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Biggest Gainer */}
          {data.biggestGainer && (
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Biggest Gainer This Period
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {data.biggestGainer.name === brandName ? "You!" : data.biggestGainer.name}
                </span>
                <Badge className="bg-emerald-500 hover:bg-emerald-600">
                  +{data.biggestGainer.change.toFixed(1)}pp
                </Badge>
              </div>
            </div>
          )}

          {/* Biggest Loser */}
          {data.biggestLoser && (
            <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-rose-600" />
                <span className="text-sm font-medium text-rose-700 dark:text-rose-400">
                  Biggest Decline This Period
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {data.biggestLoser.name === brandName ? "You" : data.biggestLoser.name}
                </span>
                <Badge variant="destructive">
                  {data.biggestLoser.change.toFixed(1)}pp
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Competitor Activity Alerts */}
        {growingCompetitors.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Competitors Gaining Ground
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {growingCompetitors.slice(0, 4).map((comp) => (
                <Badge 
                  key={comp.id} 
                  variant="outline"
                  className="border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                >
                  {comp.name}: +{comp.shareChange}pp
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Summary Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/30 px-4 py-2 border-b">
            <span className="text-sm font-medium text-muted-foreground">
              Competitor Movement Summary
            </span>
          </div>
          <div className="divide-y">
            {data.competitorChanges.slice(0, 5).map((comp) => (
              <div 
                key={comp.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: comp.color || "#64748b" }}
                  />
                  <span className="font-medium">{comp.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {comp.mentionsChange > 0 ? "+" : ""}{comp.mentionsChange} mentions
                  </span>
                  <div className={cn(
                    "flex items-center gap-1 font-medium",
                    getChangeColor(comp.shareChange)
                  )}>
                    {getChangeIcon(comp.shareChange)}
                    {comp.shareChange > 0 ? "+" : ""}{comp.shareChange}pp
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
