"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Brain, Target, Users } from "lucide-react";
import { SentimentMetrics } from "@/lib/queries/sentiment-analysis";

interface SentimentOverviewCardsProps {
  metrics: SentimentMetrics;
  isLoading?: boolean;
}

export function SentimentOverviewCards({ metrics, isLoading }: SentimentOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2 mt-1"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment >= 0.6) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (sentiment <= 0.4) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.6) return "text-green-600";
    if (sentiment <= 0.4) return "text-red-600";
    return "text-yellow-600";
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment >= 0.6) return "Positive";
    if (sentiment <= 0.4) return "Negative";
    return "Neutral";
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Analyses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Responses Analyzed</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalAnalyses.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Unique AI responses analyzed
          </p>
        </CardContent>
      </Card>

      {/* Overall Sentiment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Sentiment</CardTitle>
          {getSentimentIcon(metrics.averageSentiment)}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getSentimentColor(metrics.averageSentiment)}`}>
            {getSentimentLabel(metrics.averageSentiment)}
          </div>
          <p className="text-xs text-muted-foreground">
            Score: {(metrics.averageSentiment * 100).toFixed(1)}/100
          </p>
        </CardContent>
      </Card>

      {/* Confidence Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(metrics.confidenceScore * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Analysis reliability
          </p>
        </CardContent>
      </Card>

      {/* Brand vs Competitor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Brand Analyses</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.brandAnalyses.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {formatPercentage(metrics.brandAnalyses, metrics.totalAnalyses)} of total
          </p>
        </CardContent>
      </Card>

      {/* Sentiment Distribution */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Sentiment Distribution</CardTitle>
          <CardDescription>Breakdown of sentiment categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                Positive
              </Badge>
              <span className="text-sm font-medium">{metrics.sentimentDistribution.positive}</span>
              <span className="text-xs text-muted-foreground">
                ({formatPercentage(metrics.sentimentDistribution.positive, metrics.totalAnalyses)})
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <Minus className="h-3 w-3 mr-1" />
                Neutral
              </Badge>
              <span className="text-sm font-medium">{metrics.sentimentDistribution.neutral}</span>
              <span className="text-xs text-muted-foreground">
                ({formatPercentage(metrics.sentimentDistribution.neutral, metrics.totalAnalyses)})
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <TrendingDown className="h-3 w-3 mr-1" />
                Negative
              </Badge>
              <span className="text-sm font-medium">{metrics.sentimentDistribution.negative}</span>
              <span className="text-xs text-muted-foreground">
                ({formatPercentage(metrics.sentimentDistribution.negative, metrics.totalAnalyses)})
              </span>
            </div>
          </div>
          
          {/* Visual bar */}
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full flex">
              <div 
                className="bg-green-500" 
                style={{ 
                  width: `${formatPercentage(metrics.sentimentDistribution.positive, metrics.totalAnalyses)}` 
                }}
              />
              <div 
                className="bg-yellow-500" 
                style={{ 
                  width: `${formatPercentage(metrics.sentimentDistribution.neutral, metrics.totalAnalyses)}` 
                }}
              />
              <div 
                className="bg-red-500" 
                style={{ 
                  width: `${formatPercentage(metrics.sentimentDistribution.negative, metrics.totalAnalyses)}` 
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
