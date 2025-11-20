"use client";

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
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

interface PageData {
  pageUrl: string;
  pageTitle: string;
  totalCitations: number;
  uniqueAiAnswers: number;
  trend?: string;
  platformBreakdown: Record<string, number>;
}

interface TopPerformingPagesTableProps {
  data: PageData[];
}

const getTrendIcon = (trend?: string) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    case "stable":
      return <Minus className="h-4 w-4 text-gray-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
};

const getTruncatedUrl = (url: string | undefined | null, maxLength: number = 50) => {
  if (!url) return "N/A";
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + "...";
};

export function TopPerformingPagesTable({ data }: TopPerformingPagesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Top Performing Pages</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pages from your domain with the most AI citations
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Page</TableHead>
                <TableHead className="text-center">AI Answers</TableHead>
                <TableHead className="text-right">Citations</TableHead>
                <TableHead className="text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No page citation data available yet
                  </TableCell>
                </TableRow>
              ) : (
                data.map((page, index) => (
                  <TableRow key={page.pageUrl}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <a
                          href={page.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          <p className="font-medium text-sm truncate max-w-md group-hover:underline">
                            {page.pageTitle || getTruncatedUrl(page.pageUrl)}
                          </p>
                          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                        </a>
                        <a
                          href={page.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-muted-foreground font-mono hover:text-primary transition-colors hover:underline"
                        >
                          {getTruncatedUrl(page.pageUrl, 60)}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {page.uniqueAiAnswers}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {page.totalCitations}
                    </TableCell>
                    <TableCell className="text-center">
                      {getTrendIcon(page.trend)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

