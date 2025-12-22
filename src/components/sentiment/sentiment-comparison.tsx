"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Award } from "lucide-react";
import { EntitySentiment } from "@/lib/queries/sentiment-analysis";

interface SentimentComparisonProps {
  entities: EntitySentiment[];
  isLoading?: boolean;
}

export function SentimentComparison({ entities, isLoading }: SentimentComparisonProps) {
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sentiment Pulse</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-6">
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
          <CardTitle className="text-lg">Sentiment Pulse</CardTitle>
          <p className="text-sm text-muted-foreground">
            Brand sentiment distribution
          </p>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-6">
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No sentiment data yet</p>
            <p className="text-xs mt-2">Run analysis to see your sentiment pulse</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = brandEntity.positiveCount + brandEntity.negativeCount;
  const positivePercentage = total > 0 ? (brandEntity.positiveCount / total) * 100 : 0;
  const negativePercentage = total > 0 ? (brandEntity.negativeCount / total) * 100 : 0;

  // Determine dominant sentiment
  const dominantSentiment = positivePercentage >= negativePercentage ? 'positive' : 'negative';

  const sentimentColor = {
    positive: 'from-green-500 to-emerald-600',
    neutral: 'from-amber-500 to-yellow-600',
    negative: 'from-red-500 to-rose-600',
  }[dominantSentiment];

  const sentimentEmoji = {
    positive: '😊',
    neutral: '😐',
    negative: '😞',
  }[dominantSentiment];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Sentiment Pulse</CardTitle>
        <p className="text-sm text-muted-foreground">
          {brandEntity.entityName} sentiment distribution
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between p-6">
        {/* Central Emoji Display */}
        <div className="relative flex-1 flex flex-col justify-center">
          <div className={`absolute inset-0 bg-gradient-to-br ${sentimentColor} opacity-10 blur-3xl rounded-full`}></div>
          <div className="relative text-center">
            <div className="text-7xl mb-3">{sentimentEmoji}</div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {total} analyses
              </Badge>
            </div>
          </div>
        </div>

        {/* Horizontal Stacked Bar and Legend */}
        <div className="space-y-4 mt-4">
          <div className="flex h-4 rounded-full overflow-hidden shadow-inner bg-muted/30">
            {positivePercentage > 0 && (
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000 ease-out relative group"
                style={{ width: `${positivePercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            )}
            {negativePercentage > 0 && (
              <div
                className="bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-1000 ease-out relative group"
                style={{ width: `${negativePercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            )}
          </div>

          {/* Legend - 2 columns for Positive and Negative only */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="group cursor-default">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-sm"></div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-green-600 transition-colors">
                  Positive
                </span>
              </div>
              <div className="text-xl font-bold text-green-600">
                {positivePercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {brandEntity.positiveCount} mentions
              </div>
            </div>

            <div className="group cursor-default">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-red-500 to-rose-500 shadow-sm"></div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-red-600 transition-colors">
                  Negative
                </span>
              </div>
              <div className="text-xl font-bold text-red-600">
                {negativePercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {brandEntity.negativeCount} mentions
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
