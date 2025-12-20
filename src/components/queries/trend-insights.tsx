"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, TrendingDown, Zap, Target, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendMetrics {
  risingCount: number;
  decliningCount: number;
  newCount: number;
  momentumScore: number;
}

interface RisingQuery {
  query: string;
  growth: number;
}

interface DecliningQuery {
  query: string;
  decline: number;
}

interface TrendInsightsProps {
  metrics: TrendMetrics;
  topRising?: RisingQuery[];
  topDeclining?: DecliningQuery[];
  isLoading?: boolean;
}

export function TrendInsights({ metrics, topRising, topDeclining, isLoading }: TrendInsightsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-muted-foreground" />
            Trend Insights
          </CardTitle>
          <CardDescription>Strategic recommendations based on query trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate insights based on data
  const insights: Array<{
    type: "success" | "warning" | "info" | "opportunity";
    icon: typeof TrendingUp;
    title: string;
    description: string;
  }> = [];

  // Momentum insight
  if (metrics.momentumScore > 10) {
    insights.push({
      type: "success",
      icon: TrendingUp,
      title: "Strong positive momentum",
      description: `Query volume is up ${metrics.momentumScore.toFixed(1)}% compared to the previous period. Your brand is getting more AI attention.`,
    });
  } else if (metrics.momentumScore < -10) {
    insights.push({
      type: "warning",
      icon: AlertTriangle,
      title: "Declining query momentum",
      description: `Query volume is down ${Math.abs(metrics.momentumScore).toFixed(1)}%. Consider refreshing your content strategy.`,
    });
  }

  // Rising queries insight
  if (metrics.risingCount > 0 && topRising && topRising.length > 0) {
    const top = topRising[0];
    insights.push({
      type: "opportunity",
      icon: TrendingUp,
      title: `"${top.query.substring(0, 40)}${top.query.length > 40 ? "..." : ""}" is surging`,
      description: `This query grew by ${top.growth.toFixed(1)}%. Optimize your content for this search pattern.`,
    });
  }

  // New queries insight
  if (metrics.newCount > 5) {
    insights.push({
      type: "info",
      icon: Zap,
      title: `${metrics.newCount} new search patterns detected`,
      description: "AI models are using new queries. Monitor these emerging patterns for content opportunities.",
    });
  }

  // Declining queries insight
  if (metrics.decliningCount > 0 && topDeclining && topDeclining.length > 0) {
    const top = topDeclining[0];
    insights.push({
      type: "warning",
      icon: TrendingDown,
      title: "Some queries are losing traction",
      description: `"${top.query.substring(0, 30)}${top.query.length > 30 ? "..." : ""}" declined by ${top.decline.toFixed(1)}%. Search patterns may be shifting.`,
    });
  }

  // Balance insight
  if (metrics.risingCount > metrics.decliningCount * 2) {
    insights.push({
      type: "success",
      icon: Target,
      title: "Healthy query growth",
      description: `Rising queries (${metrics.risingCount}) significantly outnumber declining ones (${metrics.decliningCount}). Keep up the momentum!`,
    });
  }

  // If no insights, show default
  if (insights.length === 0) {
    insights.push({
      type: "info",
      icon: Lightbulb,
      title: "Gathering trend data",
      description: "As more queries are tracked, strategic insights will appear here to help optimize your content.",
    });
  }

  const colorMap = {
    success: {
      border: "border-emerald-200 dark:border-emerald-900",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      icon: "text-emerald-600",
      title: "text-emerald-900 dark:text-emerald-100",
      desc: "text-emerald-700 dark:text-emerald-300",
    },
    info: {
      border: "border-blue-200 dark:border-blue-900",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      icon: "text-blue-600",
      title: "text-blue-900 dark:text-blue-100",
      desc: "text-blue-700 dark:text-blue-300",
    },
    warning: {
      border: "border-amber-200 dark:border-amber-900",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      icon: "text-amber-600",
      title: "text-amber-900 dark:text-amber-100",
      desc: "text-amber-700 dark:text-amber-300",
    },
    opportunity: {
      border: "border-purple-200 dark:border-purple-900",
      bg: "bg-purple-50 dark:bg-purple-950/20",
      icon: "text-purple-600",
      title: "text-purple-900 dark:text-purple-100",
      desc: "text-purple-700 dark:text-purple-300",
    },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-muted-foreground" />
          Trend Insights
        </CardTitle>
        <CardDescription>Strategic recommendations based on query trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const colors = colorMap[insight.type];
            const Icon = insight.icon;
            return (
              <div
                key={index}
                className={cn("rounded-lg border p-4", colors.border, colors.bg)}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", colors.icon)} />
                  <div>
                    <p className={cn("font-medium", colors.title)}>{insight.title}</p>
                    <p className={cn("mt-1 text-sm", colors.desc)}>{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
