"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target } from "lucide-react";

interface TopTopicData {
  topic: string;
  avg_sentiment_score: number;
  evaluation_count: number;
  brand_score: number;
  best_competitor_score: number;
  competitive_advantage: number;
  improvement_30d: number | null;
}

interface TopPerformingTopicsScorecardProps {
  data: TopTopicData[];
  isLoading?: boolean;
}

export function TopPerformingTopicsScorecard({
  data,
  isLoading,
}: TopPerformingTopicsScorecardProps) {
  // Calculate different metrics
  const bestSentiment = data
    .sort((a, b) => b.avg_sentiment_score - a.avg_sentiment_score)
    .slice(0, 5);

  const competitiveAdvantage = data
    .sort((a, b) => b.competitive_advantage - a.competitive_advantage)
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Top Performing Topics</CardTitle>
          <CardDescription>Key metrics and highlights</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Top Performing Topics</CardTitle>
          <CardDescription>Key metrics and highlights</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No topic performance data available</p>
        </CardContent>
      </Card>
    );
  }

  const MetricCard = ({
    title,
    icon: Icon,
    items,
    valueFormatter,
  }: {
    title: string;
    icon: any;
    items: TopTopicData[];
    valueFormatter: (item: TopTopicData) => string;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.topic} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-medium text-muted-foreground w-6">
                  #{idx + 1}
                </span>
                <span className="text-sm truncate" title={item.topic}>
                  {item.topic}
                </span>
              </div>
              <span className="text-sm font-semibold ml-2">{valueFormatter(item)}</span>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Top Performing Topics</CardTitle>
        <CardDescription>Key metrics and highlights by different criteria</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Best Sentiment Score"
            icon={Trophy}
            items={bestSentiment}
            valueFormatter={(item) => item.avg_sentiment_score.toFixed(2)}
          />
          <MetricCard
            title="Competitive Advantage"
            icon={Target}
            items={competitiveAdvantage}
            valueFormatter={(item) =>
              `${item.competitive_advantage > 0 ? "+" : ""}${item.competitive_advantage.toFixed(2)}`
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

