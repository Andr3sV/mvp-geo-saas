"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Quote, 
  Users, 
  TrendingUp,
  ExternalLink,
  Calendar
} from "lucide-react";
import { getPromptCitationSummary, PromptCitationSummary } from "@/lib/queries/prompt-citations";
import { formatDistanceToNow } from "date-fns";

interface PromptCitationsSummaryProps {
  promptId: string;
  isVisible: boolean;
}

export function PromptCitationsSummary({ promptId, isVisible }: PromptCitationsSummaryProps) {
  const [summary, setSummary] = useState<PromptCitationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isVisible && !summary) {
      loadSummary();
    }
  }, [isVisible, promptId]);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const data = await getPromptCitationSummary(promptId);
      setSummary(data);
    } catch (error) {
      console.error("Error loading citation summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <Card className="mt-3 border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            Loading citation results...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="mt-3 border-l-4 border-l-gray-300">
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">
            No analysis results yet. Run analysis to see citations.
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCitations = summary.brandCitations.count + summary.competitorCitations.count;
  const hasResults = totalCitations > 0;

  return (
    <Card className={`mt-3 border-l-4 ${hasResults ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
      <div>
        <div onClick={() => setIsExpanded(!isExpanded)}>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Quote className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm">Analysis Results</CardTitle>
                </div>
                
                <div className="flex items-center gap-2">
                  {summary.brandCitations.count > 0 && (
                    <Badge variant="default" className="text-xs">
                      {summary.brandCitations.count} Brand
                    </Badge>
                  )}
                  {summary.competitorCitations.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {summary.competitorCitations.count} Competitors
                    </Badge>
                  )}
                  {totalCitations === 0 && (
                    <Badge variant="outline" className="text-xs">
                      No Citations
                    </Badge>
                  )}
                </div>
              </div>

              {summary.lastAnalysis && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(summary.lastAnalysis), { addSuffix: true })}
                </div>
              )}
            </div>
          </CardHeader>
        </div>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {summary.brandCitations.count}
                  </div>
                  <div className="text-xs text-muted-foreground">Brand Citations</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600">
                    {summary.competitorCitations.competitors.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Competitors Found</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {summary.totalResponses}
                  </div>
                  <div className="text-xs text-muted-foreground">AI Responses</div>
                </div>
              </div>

              {/* Brand Citations */}
              {summary.brandCitations.count > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium text-sm">Your Brand Citations</h4>
                  </div>
                  
                  <div className="space-y-2 pl-6">
                    <div className="flex flex-wrap gap-1">
                      {summary.brandCitations.platforms.map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 text-xs">
                      <span className="text-green-600">
                        ✓ {summary.brandCitations.sentiment.positive} Positive
                      </span>
                      <span className="text-gray-600">
                        ○ {summary.brandCitations.sentiment.neutral} Neutral
                      </span>
                      <span className="text-red-600">
                        ✗ {summary.brandCitations.sentiment.negative} Negative
                      </span>
                    </div>

                    {/* Show first few citations */}
                    {summary.brandCitations.citations.slice(0, 2).map((citation) => (
                      <div key={citation.id} className="text-xs p-2 bg-blue-50 dark:bg-blue-950/20 rounded border-l-2 border-l-blue-500">
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex-1 line-clamp-2">"{citation.citation_text}"</p>
                          {citation.cited_url && (
                            <a
                              href={citation.cited_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {citation.platform}
                          </Badge>
                          <span className={`text-xs ${
                            citation.sentiment === 'positive' ? 'text-green-600' :
                            citation.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {citation.sentiment}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitor Citations */}
              {summary.competitorCitations.count > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-500" />
                    <h4 className="font-medium text-sm">Competitor Citations</h4>
                  </div>
                  
                  <div className="space-y-2 pl-6">
                    {summary.competitorCitations.competitors.map((competitor) => (
                      <div key={competitor.name} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{competitor.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {competitor.citations} citations
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          {competitor.platforms.map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Show first competitor citation */}
                    {summary.competitorCitations.citations.slice(0, 1).map((citation) => (
                      <div key={citation.id} className="text-xs p-2 bg-orange-50 dark:bg-orange-950/20 rounded border-l-2 border-l-orange-500">
                        <p className="line-clamp-2">"{citation.citation_text}"</p>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {citation.platform}
                          </Badge>
                          <span className="text-xs font-medium">{citation.competitor_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {totalCitations === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <Quote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No citations found in this analysis</p>
                  <p className="text-xs">Try different prompts or platforms</p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </div>
    </Card>
  );
}
