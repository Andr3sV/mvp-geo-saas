"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Search, MessageSquare, Sparkles } from "lucide-react";

interface TopQueryData {
  query: string;
  count: number;
  platforms: string[];
  domains: string[];
}

interface TopQueriesTableProps {
  data: TopQueryData[];
  isLoading?: boolean;
}

const PLATFORM_COLORS: Record<string, string> = {
  openai: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  gemini: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const PLATFORM_ICONS: Record<string, typeof MessageSquare> = {
  openai: MessageSquare,
  gemini: Sparkles,
};

export function TopQueriesTable({ data, isLoading }: TopQueriesTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            Top Search Queries
          </CardTitle>
          <CardDescription>Most frequent queries leading to citations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            Top Search Queries
          </CardTitle>
          <CardDescription>Most frequent queries leading to citations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Search className="h-12 w-12 opacity-50" />
            <p>No query data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              Top Search Queries
            </CardTitle>
            <CardDescription>Most frequent queries leading to citations</CardDescription>
          </div>
          <Badge variant="secondary">{data.length} queries</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Query</TableHead>
                <TableHead className="w-24 text-center">Count</TableHead>
                <TableHead className="w-32">Platforms</TableHead>
                <TableHead className="w-48">Cited Domains</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={`${item.query}-${index}`} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm" title={item.query}>
                      {item.query.length > 60 ? item.query.substring(0, 60) + "..." : item.query}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold tabular-nums">{item.count}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.platforms.map((platform) => {
                        const Icon = PLATFORM_ICONS[platform] || MessageSquare;
                        return (
                          <Badge
                            key={platform}
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${PLATFORM_COLORS[platform] || ""}`}
                          >
                            <Icon className="h-2.5 w-2.5 mr-0.5" />
                            {platform === "openai" ? "OpenAI" : platform === "gemini" ? "Gemini" : platform}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {item.domains.slice(0, 3).map((domain, i) => (
                        <div
                          key={`${domain}-${i}`}
                          className="flex items-center"
                          title={domain}
                        >
                          <BrandLogo domain={domain} name={domain} size={16} />
                        </div>
                      ))}
                      {item.domains.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{item.domains.length - 3}
                        </span>
                      )}
                    </div>
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
