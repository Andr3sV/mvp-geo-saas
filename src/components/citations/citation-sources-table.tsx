"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CitationSource {
  id: string;
  citationText: string;
  citedUrl: string;
  citedDomain: string;
  platform: string;
  sentiment: "positive" | "neutral" | "negative";
  createdAt: string;
}

interface CitationSourcesTableProps {
  data: CitationSource[];
}

const getPlatformBadge = (platform: string) => {
  const colors: Record<string, string> = {
    perplexity: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    gemini: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    claude: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };

  return (
    <Badge variant="outline" className={colors[platform] || ""}>
      {platform === "perplexity" && "Perplexity"}
      {platform === "gemini" && "Gemini"}
      {platform === "openai" && "OpenAI"}
      {platform === "claude" && "Claude"}
    </Badge>
  );
};

const getSentimentBadge = (sentiment: string) => {
  switch (sentiment) {
    case "positive":
      return <Badge variant="default" className="bg-green-500">Positive</Badge>;
    case "negative":
      return <Badge variant="destructive">Negative</Badge>;
    case "neutral":
    default:
      return <Badge variant="secondary">Neutral</Badge>;
  }
};

export function CitationSourcesTable({ data }: CitationSourcesTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Citation Sources
          </CardTitle>
          <CardDescription>
            Individual sources citing your brand with URLs from web search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Citation Sources Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Run analysis with <strong>Perplexity</strong> or <strong>Gemini</strong> to
              get real citations with URLs from web search.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              💡 OpenAI and Claude don't provide URLs (mentions only)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Citation Sources
        </CardTitle>
        <CardDescription>
          Individual sources citing your brand ({data.length} citation{data.length !== 1 ? "s" : ""})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">Source URL</TableHead>
                <TableHead className="px-5 w-[30%]">Citation Text</TableHead>
                <TableHead className="px-5">Platform</TableHead>
                <TableHead className="px-5">Sentiment</TableHead>
                <TableHead className="text-right px-5">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((citation) => (
                <TableRow key={citation.id}>
                  <TableCell className="px-5">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{citation.citedDomain}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {citation.citedUrl}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 w-[30%]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm line-clamp-2 max-w-[280px] cursor-help">
                          {citation.citationText}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-md p-4 text-sm bg-popover text-popover-foreground border shadow-lg"
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {citation.citationText}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="px-5">{getPlatformBadge(citation.platform)}</TableCell>
                  <TableCell className="px-5">{getSentimentBadge(citation.sentiment)}</TableCell>
                  <TableCell className="text-right px-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={citation.citedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>View</span>
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

