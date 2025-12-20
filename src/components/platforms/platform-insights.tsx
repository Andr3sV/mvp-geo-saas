"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Platform {
  id: string;
  name: string;
  mentions: number;
  share: number;
  trend: number;
}

interface PlatformInsightsProps {
  platforms: Platform[];
  isLoading?: boolean;
}

export function PlatformInsights({ platforms, isLoading }: PlatformInsightsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-muted-foreground" />
            Platform Insights
          </CardTitle>
          <CardDescription>Strategic recommendations based on platform performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!platforms || platforms.length === 0) {
    return null;
  }

  // Generate insights
  const insights: Array<{
    type: "success" | "warning" | "info" | "opportunity";
    icon: typeof TrendingUp;
    title: string;
    description: string;
  }> = [];

  // Find best and worst performing platforms
  const sortedByShare = [...platforms].sort((a, b) => b.share - a.share);
  const bestPlatform = sortedByShare[0];
  const worstPlatform = sortedByShare[sortedByShare.length - 1];

  // Find fastest growing
  const sortedByTrend = [...platforms].sort((a, b) => b.trend - a.trend);
  const fastestGrowing = sortedByTrend[0];
  const fastestDeclining = sortedByTrend[sortedByTrend.length - 1];

  // Best performing platform
  if (bestPlatform && bestPlatform.share > 50) {
    insights.push({
      type: "success",
      icon: CheckCircle2,
      title: `Strong presence on ${bestPlatform.name}`,
      description: `You dominate ${bestPlatform.name} with ${bestPlatform.share}% market share. Continue optimizing content for this platform.`,
    });
  } else if (bestPlatform) {
    insights.push({
      type: "info",
      icon: Target,
      title: `Best performing: ${bestPlatform.name}`,
      description: `${bestPlatform.name} is your strongest platform with ${bestPlatform.share}% share. Focus on maintaining this lead.`,
    });
  }

  // Growth opportunity
  if (worstPlatform && bestPlatform && bestPlatform.share - worstPlatform.share > 10) {
    insights.push({
      type: "opportunity",
      icon: TrendingUp,
      title: `Growth opportunity on ${worstPlatform.name}`,
      description: `There's a ${(bestPlatform.share - worstPlatform.share).toFixed(1)}% gap between platforms. Consider dedicating more resources to ${worstPlatform.name}.`,
    });
  }

  // Trending up
  if (fastestGrowing && fastestGrowing.trend > 5) {
    insights.push({
      type: "success",
      icon: TrendingUp,
      title: `${fastestGrowing.name} momentum is strong`,
      description: `Your share on ${fastestGrowing.name} grew by ${fastestGrowing.trend}% this period. Keep up the momentum.`,
    });
  }

  // Trending down
  if (fastestDeclining && fastestDeclining.trend < -5) {
    insights.push({
      type: "warning",
      icon: AlertTriangle,
      title: `${fastestDeclining.name} share declining`,
      description: `Your presence on ${fastestDeclining.name} dropped by ${Math.abs(fastestDeclining.trend)}%. Review your content strategy for this platform.`,
    });
  }

  // Equal performance
  if (platforms.length === 2 && Math.abs(platforms[0].share - platforms[1].share) < 5) {
    insights.push({
      type: "info",
      icon: Target,
      title: "Balanced platform presence",
      description: "Your performance is similar across both platforms. Consider platform-specific optimizations to gain an edge.",
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
          Platform Insights
        </CardTitle>
        <CardDescription>Strategic recommendations based on platform performance</CardDescription>
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
