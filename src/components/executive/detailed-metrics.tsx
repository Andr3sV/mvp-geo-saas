"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Crown, ChevronDown, Smile, Meh, Frown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompetitiveBattlefieldData } from "@/lib/queries/executive-overview";

type EntitySentimentData = Array<{
  entityName: string;
  entityDomain?: string;
  analysisType: "brand" | "competitor";
  totalMentions: number;
  averageSentiment: number;
  sentimentLabel?: "positive" | "neutral" | "negative";
  topPositiveAttributes?: Array<{ name: string; count: number }>;
  topNegativeAttributes?: Array<{ name: string; count: number }>;
}>;

interface DetailedMetricsProps {
  battlefieldData: CompetitiveBattlefieldData | null;
  entitySentiments: EntitySentimentData;
  isLoading?: boolean;
}

const INITIAL_COUNT = 10;
const INCREMENT_COUNT = 10;

export function DetailedMetrics({ battlefieldData, entitySentiments, isLoading }: DetailedMetricsProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  // Reset visible count when data changes
  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [battlefieldData?.brand.id]);

  if (isLoading || !battlefieldData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Leaders</CardTitle>
          <CardDescription>Who&apos;s winning the AI conversation?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-6 bg-muted rounded-full" />
                </div>
                <div className="w-16 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine brand and competitors, sort by share
  const allEntities = [battlefieldData.brand, ...battlefieldData.competitors].sort(
    (a, b) => b.mentionsShare - a.mentionsShare
  );

  const maxShare = Math.max(...allEntities.map((e) => e.mentionsShare));

  // Helper to get sentiment data for an entity
  const getSentimentEntity = (entity: typeof battlefieldData.brand) => {
    return entitySentiments.find(
      (e) =>
        e.analysisType === (entity.isBrand ? "brand" : "competitor") &&
        (e.entityName.toLowerCase() === entity.name.toLowerCase() ||
          e.entityDomain === entity.domain)
    );
  };

  // Helper to get sentiment score (0-100)
  const getSentimentScore = (averageSentiment: number) => {
    return Math.round(averageSentiment * 100);
  };

  // Helper to get sentiment display
  const getSentimentDisplay = (score: number, label?: "positive" | "neutral" | "negative") => {
    if (label === "positive" || score >= 60) {
      return {
        emoji: <Smile className="h-4 w-4 text-emerald-600" />,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      };
    } else if (label === "negative" || score <= 40) {
      return {
        emoji: <Frown className="h-4 w-4 text-rose-600" />,
        color: "text-rose-600",
        bgColor: "bg-rose-50",
      };
    } else {
      return {
        emoji: <Meh className="h-4 w-4 text-amber-600" />,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
      };
    }
  };

  // Helper to get growth display
  const getGrowthDisplay = (trend: number) => {
    if (trend > 0) {
      return {
        icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        value: `+${trend.toFixed(1)}%`,
      };
    } else if (trend < 0) {
      return {
        icon: <TrendingDown className="h-3.5 w-3.5 text-rose-600" />,
        color: "text-rose-600",
        bgColor: "bg-rose-50",
        value: `${trend.toFixed(1)}%`,
      };
    } else {
      return {
        icon: <Minus className="h-3 w-3 text-muted-foreground" />,
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
        value: "0.0%",
      };
    }
  };

  const visibleEntities = allEntities.slice(0, visibleCount);
  const hasMore = allEntities.length > visibleCount;
  const remainingCount = allEntities.length - visibleCount;

  const handleViewMore = () => {
    setVisibleCount((prev) => Math.min(prev + INCREMENT_COUNT, allEntities.length));
  };

  return (
    <Card className="gap-2">
      <CardHeader className="pb-4">
        <CardTitle>Market Leaders</CardTitle>
        <CardDescription>Who&apos;s winning the AI conversation?</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 pl-2 pr-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  RANK
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">
                  BRAND
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-64">
                  MARKET SHARE
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  GROWTH (YOY)
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  SENTIMENT
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleEntities.map((entity, index) => {
                const sentimentEntity = getSentimentEntity(entity);
                const sentimentScore = sentimentEntity
                  ? getSentimentScore(sentimentEntity.averageSentiment)
                  : 50;
                const sentimentLabel = sentimentEntity?.sentimentLabel;
                const sentimentDisplay = getSentimentDisplay(sentimentScore, sentimentLabel);
                const growthDisplay = getGrowthDisplay(entity.trend);
                const barWidth = maxShare > 0 ? (entity.mentionsShare / maxShare) * 100 : 0;
                const isLeader = index === 0;

                return (
                  <tr
                    key={entity.id}
                    className={cn(
                      "border-b transition-colors hover:bg-muted/30",
                      entity.isBrand && "bg-primary/5"
                    )}
                  >
                    {/* RANK */}
                    <td className="py-4 pl-2 pr-2">
                      <div className="flex items-center">
                        {isLeader ? (
                          <Crown className="h-5 w-5 text-amber-500" />
                        ) : (
                          <span className="text-sm font-semibold text-muted-foreground">
                            #{entity.rank}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* BRAND */}
                    <td className="py-4 pl-2 pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${entity.color || "#64748b"}20` }}
                        >
                          <BrandLogo
                            domain={entity.domain || entity.name}
                            name={entity.name}
                            size={32}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              "text-sm font-semibold truncate",
                              entity.isBrand && "text-primary"
                            )}
                          >
                            {entity.name}
                          </span>
                          {entity.isBrand && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                              Your Brand
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* MARKET SHARE */}
                    <td className="py-4 pl-2 pr-4 w-64">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              entity.isBrand && "text-primary"
                            )}
                          >
                            {entity.mentionsShare.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: entity.color || "#64748b",
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* GROWTH (YOY) */}
                    <td className="py-4 pl-2 pr-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          growthDisplay.bgColor,
                          growthDisplay.color,
                          "border-0"
                        )}
                      >
                        <span className="mr-1">{growthDisplay.icon}</span>
                        {growthDisplay.value}
                      </Badge>
                    </td>

                    {/* SENTIMENT */}
                    <td className="py-4 pl-2 pr-4">
                      <div className="flex items-center gap-2">
                        {sentimentDisplay.emoji}
                        <span className={cn("text-sm font-semibold", sentimentDisplay.color)}>
                          {sentimentScore}/100
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* View More Button */}
        {hasMore && (
          <div className="pt-4 pb-2">
            <Button
              variant="ghost"
              onClick={handleViewMore}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              View More ({Math.min(remainingCount, INCREMENT_COUNT)} more)
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Summary Footer */}
        <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-6 text-muted-foreground">
            <span>
              <strong className="text-foreground">{allEntities.length}</strong> brands tracked
            </span>
            <span>
              <strong className="text-foreground">
                {battlefieldData.totalMentions.toLocaleString()}
              </strong>{" "}
              total mentions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Your position:</span>
            <Badge
              variant={battlefieldData.brand.rank === 1 ? "default" : "secondary"}
              className={cn(
                battlefieldData.brand.rank === 1 && "bg-amber-500 hover:bg-amber-600"
              )}
            >
              #{battlefieldData.brand.rank}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
