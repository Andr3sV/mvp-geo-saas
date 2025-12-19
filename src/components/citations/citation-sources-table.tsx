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
  citedUrl: string;
  citedDomain: string;
  platform: string;
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
                  <TableHead className="px-5">Platform</TableHead>
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
                    <TableCell className="px-5">{getPlatformBadge(citation.platform)}</TableCell>
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

