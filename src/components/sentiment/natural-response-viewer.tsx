"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Calendar, MapPin, Tag } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface NaturalResponseData {
  id: string;
  topic: string;
  entity_name: string;
  entity_type: "brand" | "competitor";
  natural_response: string | null;
  sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
  sentiment_score: number | null;
  positive_attributes: string[] | null;
  negative_attributes: string[] | null;
  region: string | null;
  created_at: string;
  domains: string[] | null;
}

interface NaturalResponseViewerProps {
  data: NaturalResponseData[];
  isLoading?: boolean;
}

export function NaturalResponseViewer({
  data,
  isLoading,
}: NaturalResponseViewerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 border-green-300";
      case "negative":
        return "bg-red-100 text-red-800 border-red-300";
      case "neutral":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "mixed":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Natural Response Evaluations</CardTitle>
          <CardDescription>Readable evaluation responses by topic and entity</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse bg-muted rounded"></div>
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
          <CardTitle>Natural Response Evaluations</CardTitle>
          <CardDescription>Readable evaluation responses by topic and entity</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No evaluation responses available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Natural Response Evaluations</CardTitle>
        <CardDescription>
          Human-readable evaluation responses. Click to expand and see details.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-4">
          {data.map((eval_) => {
            const isExpanded = expandedIds.has(eval_.id);

            return (
              <Card key={eval_.id} className="border">
                <button
                  className="w-full"
                  onClick={() => toggleExpand(eval_.id)}
                >
                  <div className="p-4 flex items-start justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{eval_.topic}</span>
                          <Badge
                            variant="outline"
                            className={getSentimentColor(eval_.sentiment || null)}
                          >
                            {eval_.entity_type === "brand" ? "Brand" : "Competitor"}: {eval_.entity_name}
                          </Badge>
                          {eval_.sentiment && (
                            <Badge variant="outline" className={getSentimentColor(eval_.sentiment)}>
                              {eval_.sentiment}
                            </Badge>
                          )}
                          {eval_.sentiment_score !== null && (
                            <Badge variant="outline">
                              Score: {eval_.sentiment_score.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(eval_.created_at), "MMM dd, yyyy")}
                          </div>
                          {eval_.region && eval_.region !== "GLOBAL" && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {eval_.region}
                            </div>
                          )}
                        </div>
                        {eval_.natural_response && (
                          <p className="mt-2 text-sm line-clamp-2 text-muted-foreground">
                            {eval_.natural_response}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                </button>
                {isExpanded && (
                  <div className="p-4 pt-0 border-t space-y-4">
                      {/* Natural Response */}
                      {eval_.natural_response && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Evaluation</h4>
                          <p className="text-sm whitespace-pre-wrap">{eval_.natural_response}</p>
                        </div>
                      )}

                      {/* Attributes */}
                      {(eval_.positive_attributes?.length || eval_.negative_attributes?.length) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {eval_.positive_attributes && eval_.positive_attributes.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2 text-green-700">
                                Positive Attributes
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {eval_.positive_attributes.map((attr, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="bg-green-50 text-green-800 border-green-300"
                                  >
                                    {attr}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {eval_.negative_attributes && eval_.negative_attributes.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2 text-red-700">
                                Negative Attributes
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {eval_.negative_attributes.map((attr, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="bg-red-50 text-red-800 border-red-300"
                                  >
                                    {attr}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sources */}
                      {eval_.domains && eval_.domains.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Sources</h4>
                          <div className="flex flex-wrap gap-2">
                            {eval_.domains.slice(0, 10).map((domain, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {domain}
                              </Badge>
                            ))}
                            {eval_.domains.length > 10 && (
                              <Badge variant="secondary" className="text-xs">
                                +{eval_.domains.length - 10} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

