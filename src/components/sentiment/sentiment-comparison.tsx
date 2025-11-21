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
      <Card className="h-full flex flex-col overflow-hidden border-0 shadow-lg">
        <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent">
          <CardTitle className="text-lg">Sentiment Pulse</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-6">
          <div className="h-[300px] animate-pulse bg-muted/30 rounded-2xl"></div>
        </CardContent>
      </Card>
    );
  }

  const brandEntity = entities.find(e => e.analysisType === 'brand');

  if (!brandEntity) {
    return (
      <Card className="h-full flex flex-col overflow-hidden border-0 shadow-lg">
        <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sentiment Pulse
          </CardTitle>
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

  const total = brandEntity.positiveCount + brandEntity.neutralCount + brandEntity.negativeCount;
  const positivePercentage = total > 0 ? (brandEntity.positiveCount / total) * 100 : 0;
  const neutralPercentage = total > 0 ? (brandEntity.neutralCount / total) * 100 : 0;
  const negativePercentage = total > 0 ? (brandEntity.negativeCount / total) * 100 : 0;

  // Determine dominant sentiment
  const dominantSentiment = 
    positivePercentage >= neutralPercentage && positivePercentage >= negativePercentage ? 'positive' :
    negativePercentage >= neutralPercentage ? 'negative' : 'neutral';

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
    <Card className="h-full flex flex-col overflow-hidden border-0 shadow-lg bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${sentimentColor} shadow-lg`}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Sentiment Pulse
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-xs">
            {total} analyses
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-6 p-6 pt-0">
        {/* Central Score Display */}
        <div className="relative">
          <div className={`absolute inset-0 bg-gradient-to-br ${sentimentColor} opacity-10 blur-3xl rounded-full`}></div>
          <div className="relative text-center py-6">
            <div className="text-6xl mb-2">{sentimentEmoji}</div>
            <div className="text-5xl font-black bg-gradient-to-br ${sentimentColor} bg-clip-text text-transparent mb-1">
              {(brandEntity.averageSentiment * 100).toFixed(0)}%
            </div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Award className="h-3 w-3 mr-1" />
                {brandEntity.entityName}
              </Badge>
            </div>
          </div>
        </div>

        {/* Horizontal Stacked Bar */}
        <div className="space-y-3">
          <div className="flex h-3 rounded-full overflow-hidden shadow-inner bg-muted/30">
            {positivePercentage > 0 && (
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000 ease-out relative group"
                style={{ width: `${positivePercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            )}
            {neutralPercentage > 0 && (
              <div
                className="bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-1000 ease-out relative group"
                style={{ width: `${neutralPercentage}%` }}
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

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="group cursor-default">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-sm"></div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-green-600 transition-colors">
                  Positive
                </span>
              </div>
              <div className="text-lg font-bold text-green-600">
                {positivePercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {brandEntity.positiveCount} mentions
              </div>
            </div>

            <div className="group cursor-default">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 shadow-sm"></div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-amber-600 transition-colors">
                  Neutral
                </span>
              </div>
              <div className="text-lg font-bold text-amber-600">
                {neutralPercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {brandEntity.neutralCount} mentions
              </div>
            </div>

            <div className="group cursor-default">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-red-500 to-rose-500 shadow-sm"></div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-red-600 transition-colors">
                  Negative
                </span>
              </div>
              <div className="text-lg font-bold text-red-600">
                {negativePercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {brandEntity.negativeCount} mentions
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
