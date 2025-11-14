"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getAIResponses,
  getCitationsForResponse,
  type AIResponse,
  type CitationDetail,
} from "@/lib/actions/analysis";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  Sparkles,
  Target,
  Clock,
  DollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AnalysisDetailProps {
  jobId: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  openai: "OpenAI (GPT-4)",
  gemini: "Google Gemini",
  claude: "Anthropic Claude",
  perplexity: "Perplexity AI",
};

const PLATFORM_COLORS: Record<string, string> = {
  openai: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  gemini: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  claude: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  perplexity: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  negative: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  mixed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
};

export function AnalysisDetail({ jobId }: AnalysisDetailProps) {
  const router = useRouter();
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [citations, setCitations] = useState<Record<string, CitationDetail[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    setLoading(true);

    // Get AI responses
    const responsesResult = await getAIResponses(jobId);
    if (responsesResult.data) {
      setResponses(responsesResult.data);

      // Get citations for each response
      const citationsMap: Record<string, CitationDetail[]> = {};
      for (const response of responsesResult.data) {
        const citationsResult = await getCitationsForResponse(response.id);
        if (citationsResult.data) {
          citationsMap[response.id] = citationsResult.data;
        }
      }
      setCitations(citationsMap);
    }

    setLoading(false);
  };

  const totalCitations = Object.values(citations).reduce(
    (sum, cits) => sum + cits.length,
    0
  );
  const totalCost = responses.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalTokens = responses.reduce((sum, r) => sum + (r.tokens_used || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading analysis details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platforms</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responses.length}</div>
            <p className="text-xs text-muted-foreground">AI models tested</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citations</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCitations}</div>
            <p className="text-xs text-muted-foreground">Brand mentions found</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total tokens used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">API usage cost</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Responses */}
      <div className="space-y-4">
        {responses.map((response) => {
          const responseCitations = citations[response.id] || [];
          const isExpanded = expandedResponse === response.id;

          return (
            <Card key={response.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={PLATFORM_COLORS[response.platform]}
                    >
                      {PLATFORM_LABELS[response.platform] || response.platform}
                    </Badge>
                    {response.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{response.tokens_used} tokens</span>
                    <span>${response.cost?.toFixed(4)}</span>
                    <span>{response.execution_time_ms}ms</span>
                  </div>
                </div>
                <CardDescription>
                  Model: {response.model_version}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Citations */}
                {responseCitations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Citations Found ({responseCitations.length})
                    </h4>
                    <div className="space-y-2">
                      {responseCitations.map((citation, idx) => (
                        <div
                          key={citation.id || idx}
                          className="rounded-lg border p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm flex-1">{citation.citation_text}</p>
                            {citation.sentiment && (
                              <Badge
                                variant="secondary"
                                className={SENTIMENT_COLORS[citation.sentiment]}
                              >
                                {citation.sentiment}
                              </Badge>
                            )}
                          </div>
                          {citation.confidence_score && (
                            <p className="text-xs text-muted-foreground">
                              Confidence: {(citation.confidence_score * 100).toFixed(0)}%
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {responseCitations.length === 0 && (
                  <div className="text-sm text-muted-foreground py-2">
                    No citations found in this response
                  </div>
                )}

                <Separator />

                {/* Response Text */}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedResponse(isExpanded ? null : response.id)
                    }
                    className="mb-2"
                  >
                    {isExpanded ? "Hide" : "Show"} Full Response
                  </Button>

                  {isExpanded && response.response_text && (
                    <div className="rounded-lg border p-4 bg-muted/50 max-h-96 overflow-auto">
                      <p className="text-sm whitespace-pre-wrap">
                        {response.response_text}
                      </p>
                    </div>
                  )}

                  {response.error_message && (
                    <div className="rounded-lg border border-red-200 p-4 bg-red-50 dark:bg-red-950">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Error: {response.error_message}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

