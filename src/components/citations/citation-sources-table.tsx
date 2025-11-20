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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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

/**
 * Convert markdown-like formatting to HTML for better readability
 * Handles: **bold**, *italic*, [citation numbers], and line breaks
 */
const formatCitationText = (text: string): string => {
  if (!text) return "";

  let formatted = text;

  // Escape HTML to prevent XSS (though we control the input)
  formatted = formatted
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // First, convert **bold** to <strong>bold</strong>
  // Use non-greedy matching to handle multiple bold sections
  formatted = formatted.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");

  // Then convert *italic* to <em>italic</em> (only single asterisks remaining)
  // Match *text* where text doesn't contain asterisks
  formatted = formatted.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");

  // Convert citation references [1][2][3] to superscript with better styling
  // Make them smaller and less prominent
  formatted = formatted.replace(/\[(\d+)\]/g, '<sup class="text-[10px] text-muted-foreground/70 ml-0.5">[$1]</sup>');

  // Preserve line breaks (convert \n to <br />)
  formatted = formatted.replace(/\n/g, "<br />");

  return formatted;
};

export function CitationSourcesTable({
  data,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
}: CitationSourcesTableProps) {
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page > 3) {
        pages.push("ellipsis");
      }

      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

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
      <CardHeader className="space-y-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Citation Sources
            </CardTitle>
            <CardDescription>
              Showing {startIndex}-{endIndex} of {total} citation{total !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          {totalPages > 1 && (
            <Pagination className="ml-auto mr-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) {
                        onPageChange(page - 1);
                      }
                    }}
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {getPageNumbers().map((pageNum, index) => (
                  <PaginationItem key={index}>
                    {pageNum === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onPageChange(pageNum);
                        }}
                        isActive={pageNum === page}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) {
                        onPageChange(page + 1);
                      }
                    }}
                    className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
                          <div
                            className="text-sm line-clamp-2 max-w-[280px] cursor-help [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_em]:text-foreground/90 [&_sup]:text-[10px] [&_sup]:text-muted-foreground/70"
                            dangerouslySetInnerHTML={{
                              __html: formatCitationText(citation.citationText),
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-md p-4 text-sm bg-popover text-popover-foreground border shadow-lg"
                        >
                          <div
                            className="leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_em]:text-foreground/90"
                            dangerouslySetInnerHTML={{
                              __html: formatCitationText(citation.citationText),
                            }}
                          />
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

        </div>
      </CardContent>
    </Card>
  );
}

