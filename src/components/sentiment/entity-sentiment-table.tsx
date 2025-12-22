"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, Building, Target } from "lucide-react";
import { EntitySentiment } from "@/lib/queries/sentiment-analysis";

interface EntitySentimentTableProps {
  entities: EntitySentiment[];
  isLoading?: boolean;
}

export function EntitySentimentTable({ entities, isLoading }: EntitySentimentTableProps) {
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entity Sentiment Analysis</CardTitle>
          <CardDescription>Sentiment breakdown by brand and competitors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entities || entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entity Sentiment Analysis</CardTitle>
          <CardDescription>Sentiment breakdown by brand and competitors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No entity sentiment data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleExpanded = (entityKey: string) => {
    const newExpanded = new Set(expandedEntities);
    if (newExpanded.has(entityKey)) {
      newExpanded.delete(entityKey);
    } else {
      newExpanded.add(entityKey);
    }
    setExpandedEntities(newExpanded);
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment >= 0.6) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (sentiment <= 0.4) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getSentimentBadge = (label: string) => {
    const variants = {
      positive: "bg-green-50 text-green-700 border-green-200",
      neutral: "bg-yellow-50 text-yellow-700 border-yellow-200",
      negative: "bg-red-50 text-red-700 border-red-200",
    };
    return variants[label as keyof typeof variants] || variants.neutral;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Entity Sentiment Analysis
        </CardTitle>
        <CardDescription>
          Detailed sentiment breakdown by brand and competitors ({entities.length} entities)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entities.map((entity) => {
            const entityKey = `${entity.entityName}-${entity.analysisType}`;
            const isExpanded = expandedEntities.has(entityKey);

            return (
              <Collapsible key={entityKey} open={isExpanded} onOpenChange={() => toggleExpanded(entityKey)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      
                      <div className="flex items-center gap-3">
                        {getSentimentIcon(entity.averageSentiment)}
                        
                        <div className="text-left">
                          <div className="font-medium">{entity.entityName}</div>
                          {entity.entityDomain && (
                            <div className="text-xs text-muted-foreground">{entity.entityDomain}</div>
                          )}
                        </div>
                      </div>
                      
                      <Badge 
                        variant="outline" 
                        className={getSentimentBadge(entity.sentimentLabel)}
                      >
                        {entity.analysisType === 'brand' ? 'Brand' : 'Competitor'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className="font-medium">
                          {(entity.averageSentiment * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entity.totalMentions} mentions
                        </div>
                      </div>
                      
                      <Badge 
                        variant="outline" 
                        className={getSentimentBadge(entity.sentimentLabel)}
                      >
                        {entity.sentimentLabel}
                      </Badge>
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                    {/* Sentiment Breakdown */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Sentiment Breakdown
                      </h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-600">Positive</span>
                          <span className="text-sm font-medium">{entity.positiveCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-yellow-600">Neutral</span>
                          <span className="text-sm font-medium">{entity.neutralCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-red-600">Negative</span>
                          <span className="text-sm font-medium">{entity.negativeCount}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Confidence: {(entity.confidenceScore * 100).toFixed(1)}%
                      </div>
                    </div>

                    {/* Top Attributes */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Key Attributes</h4>
                      
                      {entity.topPositiveAttributes.length > 0 && (
                        <div>
                          <div className="text-sm text-green-600 font-medium mb-2">Positive</div>
                          <div className="flex flex-wrap gap-1">
                            {entity.topPositiveAttributes.map((attr, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                {attr.name} ({attr.count})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {entity.topNegativeAttributes.length > 0 && (
                        <div>
                          <div className="text-sm text-red-600 font-medium mb-2">Negative</div>
                          <div className="flex flex-wrap gap-1">
                            {entity.topNegativeAttributes.map((attr, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                {attr.name} ({attr.count})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Analyses */}
                  {entity.recentAnalyses.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Recent Analyses</h4>
                      <div className="space-y-3">
                        {entity.recentAnalyses.slice(0, 3).map((analysis) => (
                          <div key={analysis.id} className="border rounded-lg p-3 bg-muted/20">
                            <div className="flex items-start justify-between mb-2">
                              <Badge 
                                variant="outline" 
                                className={getSentimentBadge(analysis.sentimentLabel)}
                              >
                                {analysis.sentimentLabel} ({(analysis.overallSentiment * 100).toFixed(0)}%)
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                {analysis.platform} • {new Date(analysis.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {analysis.analyzedText}
                            </p>
                            
                            {analysis.aiReasoning && (
                              <p className="text-xs text-muted-foreground italic">
                                AI: {analysis.aiReasoning}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
