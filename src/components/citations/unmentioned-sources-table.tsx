"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Link2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OpportunityData {
  domain: string;
  domainRating: number;
  competitorsMentioned: string[];
  citationFrequency: number;
  opportunityScore: number;
  priority: string;
  topics: string[];
  pages?: string[];
}

interface UnmentionedSourcesTableProps {
  data: OpportunityData[];
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return <Badge variant="destructive">High</Badge>;
    case "medium":
      return <Badge variant="default">Medium</Badge>;
    case "low":
      return <Badge variant="secondary">Low</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
};

const getDRColor = (rating: number) => {
  if (rating >= 80) return "text-green-600 font-semibold";
  if (rating >= 60) return "text-blue-600 font-medium";
  if (rating >= 40) return "text-orange-500";
  return "text-gray-500";
};

export function UnmentionedSourcesTable({
  data,
}: UnmentionedSourcesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sources Not Mentioning You or Competitors</CardTitle>
        <p className="text-sm text-muted-foreground">
          Untapped domains with no brand or competitor mentions - prime opportunities for brand awareness
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead className="text-center">Citations</TableHead>
                <TableHead className="text-center">DR</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <p>No unmentioned sources found yet</p>
                      <p className="text-xs max-w-md">
                        Run analysis with Perplexity/Gemini to discover 
                        high-authority domains that haven't mentioned your brand or competitors yet
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((opportunity) => (
                  <TableRow key={opportunity.domain}>
                    <TableCell>
                      <a
                        href={`https://${opportunity.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <span className="font-mono text-sm">
                          {opportunity.domain}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 max-w-lg">
                        {opportunity.pages && opportunity.pages.length > 0 ? (
                          <>
                            {opportunity.pages.slice(0, 5).map((url, idx) => {
                              // Normalize URL
                              let normalizedUrl = url;
                              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                normalizedUrl = `https://${url}`;
                              }
                              
                              return (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={normalizedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center"
                                    >
                                      <div className="p-1.5 rounded-md border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer">
                                        <Link2 className="h-4 w-4" />
                                      </div>
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-md break-all">
                                    <p className="text-xs">{url}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {opportunity.pages.length > 5 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="px-2 py-1 rounded-md border border-border bg-muted/50">
                                    <span className="text-xs font-medium">+{opportunity.pages.length - 5}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-md">
                                  <p className="text-xs">
                                    {opportunity.pages.length - 5} more pages
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No pages</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {opportunity.citationFrequency}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getDRColor(opportunity.domainRating)}>
                        {opportunity.domainRating}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">
                        {opportunity.opportunityScore}
                      </span>
                    </TableCell>
                    <TableCell>{getPriorityBadge(opportunity.priority)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} - {Math.min(endIndex, data.length)} of {data.length.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


