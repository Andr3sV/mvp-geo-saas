"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Flag, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponseProperties } from "./response-properties";
import { ResponseMentions } from "./response-mentions";
import { ResponseCitations } from "./response-citations";
import { HighlightedResponse } from "./highlighted-response";
import type { AIResponseDetail } from "@/lib/queries/ai-responses";

interface ResponseDetailProps {
  response: AIResponseDetail;
}

export function ResponseDetail({ response }: ResponseDetailProps) {
  const router = useRouter();

  // Export response as JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(response, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `response-${response.id}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Visibility indicator
  const renderVisibility = () => {
    const { is_mentioned, position, total_mentions } = response.brand_visibility;

    if (!is_mentioned) {
      return (
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Brand not mentioned in this response</span>
        </div>
      );
    }

    const getPositionText = (pos: number) => {
      if (pos === 1) return "1st";
      if (pos === 2) return "2nd";
      if (pos === 3) return "3rd";
      return `${pos}th`;
    };

    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Brand mentioned {position ? getPositionText(position) : ""} of {total_mentions} mentions
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/responses")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Responses
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Flag className="h-4 w-4" />
            Report Issue
          </Button>
        </div>
      </div>

      {/* Prompt Title */}
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold leading-relaxed">
          "{response.prompt_text}"
        </h1>
      </div>

      {/* Properties Section */}
      <div className="rounded-lg border bg-card p-4">
        <ResponseProperties
          platform={response.platform}
          createdAt={response.created_at}
          region={response.prompt_tracking?.region}
          topicName={response.prompt_tracking?.topic?.name}
          modelVersion={response.model_version}
        />
      </div>

      {/* Visibility Section */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">Visibility</span>
          {renderVisibility()}
        </div>
      </div>

      {/* Mentions Section */}
      <div className="rounded-lg border bg-card p-4">
        <ResponseMentions mentions={response.brand_mentions} />
      </div>

      {/* Response Content */}
      <HighlightedResponse
        responseText={response.response_text}
        mentions={response.brand_mentions}
      />

      {/* Citations */}
      <ResponseCitations citations={response.citations} />

      {/* Metadata Footer */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Response ID:</span>{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{response.id}</code>
          </div>
          {response.tokens_used && (
            <div>
              <span className="font-medium">Tokens:</span> {response.tokens_used.toLocaleString()}
            </div>
          )}
          {response.execution_time_ms && (
            <div>
              <span className="font-medium">Execution time:</span> {response.execution_time_ms}ms
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

