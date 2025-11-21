"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, Award, Target } from "lucide-react";
import { EntitySentiment } from "@/lib/queries/sentiment-analysis";

interface SentimentComparisonProps {
  entities: EntitySentiment[];
  isLoading?: boolean;
}

export function SentimentComparison({ entities, isLoading }: SentimentComparisonProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand vs Competitors</CardTitle>
          <CardDescription>Loading comparison...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const brandEntity = entities.find(e => e.analysisType === 'brand');
  const competitors = entities.filter(e => e.analysisType === 'competitor');

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.7) return 'text-green-600 bg-green-50 border-green-200';
    if (sentiment >= 0.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment >= 0.7) return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (sentiment >= 0.5) return <Target className="h-5 w-5 text-yellow-500" />;
    return <TrendingDown className="h-5 w-5 text-red-500" />;
  };

  if (!brandEntity && competitors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Brand vs Competitors
          </CardTitle>
          <CardDescription>
            Competitive sentiment comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No sentiment data available. Run sentiment analysis to see comparisons.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Brand vs Competitors
        </CardTitle>
        <CardDescription>
          How your sentiment compares to competitors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Your Brand */}
          {brandEntity && (
            <div className={`border rounded-lg p-4 ${getSentimentColor(brandEntity.averageSentiment)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="bg-primary text-primary-foreground">
                    <Award className="h-3 w-3 mr-1" />
                    Your Brand
                  </Badge>
                  <h3 className="font-semibold">{brandEntity.entityName}</h3>
                </div>
                {getSentimentIcon(brandEntity.averageSentiment)}
              </div>
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs opacity-75 mb-1">Score</div>
                  <div className="font-bold text-lg">
                    {(brandEntity.averageSentiment * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-75 mb-1">Positive</div>
                  <div className="font-semibold">{brandEntity.positiveCount}</div>
                </div>
                <div>
                  <div className="text-xs opacity-75 mb-1">Neutral</div>
                  <div className="font-semibold">{brandEntity.neutralCount}</div>
                </div>
                <div>
                  <div className="text-xs opacity-75 mb-1">Negative</div>
                  <div className="font-semibold">{brandEntity.negativeCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* Competitors */}
          {competitors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground px-2">Competitors</h4>
              {competitors.map((competitor, i) => (
                <div 
                  key={i} 
                  className={`border rounded-lg p-3 transition-colors hover:shadow-sm ${getSentimentColor(competitor.averageSentiment)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{competitor.entityName}</h4>
                      {competitor.entityDomain && (
                        <span className="text-xs opacity-75">{competitor.entityDomain}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getSentimentIcon(competitor.averageSentiment)}
                      <span className="font-bold text-sm">
                        {(competitor.averageSentiment * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-600">✓ {competitor.positiveCount}</span>
                    <span className="text-yellow-600">— {competitor.neutralCount}</span>
                    <span className="text-red-600">✗ {competitor.negativeCount}</span>
                    <span className="text-muted-foreground ml-auto">
                      {competitor.totalMentions} mentions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
