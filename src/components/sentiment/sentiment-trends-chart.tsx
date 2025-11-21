"use client";

import { TrendingUp } from "lucide-react";
import { EvolutionChart } from "@/components/shared/evolution-chart";
import { SentimentTrend } from "@/lib/queries/sentiment-analysis";
import { format } from "date-fns";

interface SentimentTrendsChartProps {
  trends: SentimentTrend[];
  isLoading?: boolean;
}

export function SentimentTrendsChart({ trends, isLoading }: SentimentTrendsChartProps) {
  // Transform sentiment trends data to match EvolutionChart format
  const chartData = trends.map(trend => ({
    date: format(new Date(trend.date), 'MMM dd'),
    positive: trend.positive,
    negative: trend.negative,
  }));

  return (
    <EvolutionChart
      title="Sentiment Trends Over Time"
      description="Track daily positive and negative sentiment patterns"
      icon={TrendingUp}
      data={chartData}
      primaryDataKey="positive"
      secondaryDataKey="negative"
      dataLabel="mention"
      dateKey="date"
      primaryEntityName="Positive Sentiment"
      primaryEntityDomain=""
      secondaryEntityName="Negative Sentiment"
      secondaryEntityDomain=""
      entities={[]} // No entity selection for sentiment trends
      selectedEntityId={null}
      onEntityChange={() => {}} // No-op
      isLoading={isLoading}
      primaryColor="rgb(34, 197, 94)" // green-500
      secondaryColor="rgb(239, 68, 68)" // red-500
      emptyStateMessage="Run sentiment analysis to see trends over time"
    />
  );
}
