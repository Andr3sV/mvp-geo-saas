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

  // Get top 3 positive and negative attributes
  const top3Positive = brandEntity.topPositiveAttributes.slice(0, 3);
  const top3Negative = brandEntity.topNegativeAttributes.slice(0, 3);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Sentiment Pulse</CardTitle>
        <p className="text-sm text-muted-foreground">
          {brandEntity.entityName} sentiment distribution
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Central Emoji Display and Chart */}
          <div className="flex flex-col justify-between">
            {/* Central Emoji Display */}
            <div className="relative flex-1 flex flex-col justify-center min-h-[200px]">
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
          </div>

          {/* Right Column - Top Attributes */}
          <div className="flex flex-col gap-6">
            {/* Top Positive Attributes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-green-600" />
                <h3 className="text-sm font-semibold text-green-600">Top Positive Attributes</h3>
              </div>
              {top3Positive.length > 0 ? (
                <div className="space-y-2">
                  {top3Positive.map((attr, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-100">
                      <span className="text-sm font-medium text-green-900">{attr.name}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                        {attr.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No positive attributes yet</p>
              )}
            </div>

            {/* Top Negative Attributes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-red-600" />
                <h3 className="text-sm font-semibold text-red-600">Top Negative Attributes</h3>
              </div>
              {top3Negative.length > 0 ? (
                <div className="space-y-2">
                  {top3Negative.map((attr, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-md border border-red-100">
                      <span className="text-sm font-medium text-red-900">{attr.name}</span>
                      <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
                        {attr.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No negative attributes yet</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
