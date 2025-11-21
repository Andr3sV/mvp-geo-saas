"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Award, Smile, Meh, Frown } from "lucide-react";
import { EntitySentiment } from "@/lib/queries/sentiment-analysis";

interface SentimentComparisonProps {
  entities: EntitySentiment[];
  isLoading?: boolean;
}

const SENTIMENT_TIERS = [
  {
    key: "positive" as const,
    label: "Positive",
    color: "bg-green-500",
    gradient: "from-green-500 to-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    textColor: "text-green-700 dark:text-green-300",
    icon: Smile,
  },
  {
    key: "neutral" as const,
    label: "Neutral",
    color: "bg-yellow-500",
    gradient: "from-yellow-500 to-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    textColor: "text-yellow-700 dark:text-yellow-300",
    icon: Meh,
  },
  {
    key: "negative" as const,
    label: "Negative",
    color: "bg-red-500",
    gradient: "from-red-500 to-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    textColor: "text-red-700 dark:text-red-300",
    icon: Frown,
  },
];

export function SentimentComparison({ entities, isLoading }: SentimentComparisonProps) {
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sentiment Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-[300px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const brandEntity = entities.find(e => e.analysisType === 'brand');

  if (!brandEntity) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sentiment Breakdown
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Brand sentiment distribution
          </p>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8 text-muted-foreground">
            No sentiment data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = brandEntity.positiveCount + brandEntity.neutralCount + brandEntity.negativeCount;

  const breakdown = [
    {
      ...SENTIMENT_TIERS[0],
      value: brandEntity.positiveCount,
      percentage: total > 0 ? (brandEntity.positiveCount / total) * 100 : 0,
    },
    {
      ...SENTIMENT_TIERS[1],
      value: brandEntity.neutralCount,
      percentage: total > 0 ? (brandEntity.neutralCount / total) * 100 : 0,
    },
    {
      ...SENTIMENT_TIERS[2],
      value: brandEntity.negativeCount,
      percentage: total > 0 ? (brandEntity.negativeCount / total) * 100 : 0,
    },
  ].filter((item) => item.value > 0);

  const maxPercentage = Math.max(...breakdown.map(b => b.percentage), 100);

  return (
    <Card className="border-border/50 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Sentiment Breakdown
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {brandEntity.entityName} sentiment distribution
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Brand Highlight */}
        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary">
                <Award className="h-3 w-3 mr-1" />
                Your Brand
              </Badge>
              <span className="font-semibold text-sm">{brandEntity.entityName}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {(brandEntity.averageSentiment * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {total} analyses
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Bar Chart */}
        <div className="flex-1 flex items-end justify-between gap-3 min-h-[200px] pb-2">
          {breakdown.map((tier) => {
            const Icon = tier.icon;
            const barHeight = (tier.percentage / maxPercentage) * 100;
            
            return (
              <div
                key={tier.key}
                className="flex-1 flex flex-col items-center justify-end gap-2 h-full group"
              >
                {/* Bar Container */}
                <div className="relative w-full flex flex-col items-center justify-end h-full min-h-[150px]">
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
                  
                  {/* Value above bar (if bar is too short) */}
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
                    <p className="text-xs font-medium text-foreground mt-0.5">
                      {tier.value} {tier.value === 1 ? "mention" : "mentions"}
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
            <span className="text-sm text-muted-foreground">Total Mentions</span>
            <span className="text-lg font-bold">{total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
