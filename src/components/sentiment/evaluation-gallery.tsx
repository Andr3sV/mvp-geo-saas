"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Search, ExternalLink } from "lucide-react";
import { EvaluationByTheme } from "@/lib/queries/brand-evaluations";
import { BrandLogo } from "@/components/ui/brand-logo";
import { format } from "date-fns";

interface EvaluationGalleryProps {
  evaluations: EvaluationByTheme[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  isLoading?: boolean;
  brandDomain?: string;
  competitorDomains?: Map<string, string>; // competitor_id -> domain
}

export function EvaluationGallery({
  evaluations,
  currentIndex,
  onPrevious,
  onNext,
  onClose,
  isLoading,
  brandDomain,
  competitorDomains,
}: EvaluationGalleryProps) {
  if (isLoading || evaluations.length === 0) {
    return (
      <Card className="mt-2 border-t">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">
              {isLoading ? "Loading evaluations..." : "No evaluations found"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentEvaluation = evaluations[currentIndex];
  const totalEvaluations = evaluations.length;

  return (
    <Card className="mt-2 border-t">
      <CardContent className="p-4">
        {/* Header with navigation and close */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {totalEvaluations}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={currentIndex === totalEvaluations - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Evaluation content */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Brand/Competitor Badge with Logo */}
              <Badge
                variant="outline"
                className="flex items-center gap-2 px-3 py-1.5"
              >
                {currentEvaluation.entity_type === "brand" ? (
                  <>
                    {brandDomain && (
                      <BrandLogo
                        domain={brandDomain}
                        name={currentEvaluation.entity_name}
                        size={16}
                      />
                    )}
                    <span>{currentEvaluation.entity_name}</span>
                  </>
                ) : (
                  <>
                    {currentEvaluation.competitor_id && competitorDomains?.get(currentEvaluation.competitor_id) && (
                      <BrandLogo
                        domain={competitorDomains.get(currentEvaluation.competitor_id)!}
                        name={currentEvaluation.entity_name}
                        size={16}
                      />
                    )}
                    <span>{currentEvaluation.entity_name}</span>
                  </>
                )}
              </Badge>
              {currentEvaluation.sentiment && (
                <Badge
                  variant="outline"
                  className={
                    currentEvaluation.sentiment === "positive"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : currentEvaluation.sentiment === "negative"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }
                >
                  {currentEvaluation.sentiment}
                </Badge>
              )}
              {currentEvaluation.sentiment_score !== null && (
                <Badge variant="outline">
                  Score: {currentEvaluation.sentiment_score.toFixed(2)}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {format(new Date(currentEvaluation.created_at), "MMM dd, yyyy")}
              </span>
            </div>

            {/* Query Search */}
            {currentEvaluation.query_search && currentEvaluation.query_search.length > 0 && (
              <div className="flex items-start gap-2">
                <Search className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {currentEvaluation.query_search.map((query, index) => (
                    <Badge key={index} variant="secondary" className="text-xs font-normal">
                      {query}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* URL Sources */}
            {currentEvaluation.url_sources && currentEvaluation.uri_sources && 
             currentEvaluation.url_sources.length > 0 && currentEvaluation.uri_sources.length > 0 && (
              <div className="flex items-start gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {currentEvaluation.url_sources.map((url, index) => {
                    const uri = currentEvaluation.uri_sources?.[index];
                    // Extract domain from url for display
                    let displayUrl = url;
                    try {
                      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
                      displayUrl = urlObj.hostname.replace(/^www\./, '');
                    } catch (e) {
                      // Keep original if parsing fails
                    }
                    return (
                      <a
                        key={index}
                        href={uri || url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded border border-border hover:bg-muted/50 transition-colors"
                      >
                        {displayUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Natural Response */}
          {currentEvaluation.natural_response && (
            <div>
              <h4 className="text-sm font-semibold mb-2">AI Response</h4>
              <div className="text-sm bg-muted/30 p-4 rounded-md whitespace-pre-wrap leading-relaxed">
                {currentEvaluation.natural_response}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

