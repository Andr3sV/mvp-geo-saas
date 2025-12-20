"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MessageSquare, Sparkles, Bot, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProject } from "@/contexts/project-context";
import { getAIResponses, type AIResponseListItem, type GetAIResponsesFilters } from "@/lib/queries/ai-responses";
import { DateRangeValue } from "@/components/ui/date-range-picker";

// Platform configuration
const PLATFORM_CONFIG: Record<string, { name: string; color: string; bgColor: string; icon: typeof MessageSquare }> = {
  openai: {
    name: "ChatGPT",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: MessageSquare,
  },
  gemini: {
    name: "Gemini",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Sparkles,
  },
  claude: {
    name: "Claude",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    icon: Bot,
  },
  perplexity: {
    name: "Perplexity",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    icon: Search,
  },
};

// Region flags mapping
const REGION_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  ES: "🇪🇸",
  DE: "🇩🇪",
  FR: "🇫🇷",
  IT: "🇮🇹",
  MX: "🇲🇽",
  BR: "🇧🇷",
  CA: "🇨🇦",
  AU: "🇦🇺",
  GLOBAL: "🌍",
};

interface ResponsesTableProps {
  dateRange: DateRangeValue;
  platform: string;
  region: string;
  topicId: string;
}

export function ResponsesTable({
  dateRange,
  platform,
  region,
  topicId,
}: ResponsesTableProps) {
  const router = useRouter();
  const { selectedProjectId } = useProject();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [responses, setResponses] = useState<AIResponseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedProjectId || !dateRange.from || !dateRange.to) return;

    setIsLoading(true);
    try {
      const filters: GetAIResponsesFilters = {};
      if (platform !== "all") filters.platform = platform;
      if (dateRange.from) filters.fromDate = dateRange.from;
      if (dateRange.to) filters.toDate = dateRange.to;
      if (region && region !== "GLOBAL") filters.region = region;
      if (topicId && topicId !== "all") filters.topicId = topicId;

      const result = await getAIResponses(selectedProjectId, filters, page, pageSize);
      setResponses(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error loading responses:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, dateRange, platform, region, topicId, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateRange, platform, region, topicId]);

  // Handle row click
  const handleRowClick = (responseId: string) => {
    router.push(`/dashboard/responses/${responseId}`);
  };

  // Render platform badge
  const renderPlatformBadge = (platformKey: string) => {
    const config = PLATFORM_CONFIG[platformKey] || {
      name: platformKey,
      color: "text-gray-700",
      bgColor: "bg-gray-100",
      icon: MessageSquare,
    };
    const Icon = config.icon;

    return (
      <Badge variant="secondary" className={`${config.bgColor} ${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.name}
      </Badge>
    );
  };

  // Render region
  const renderRegion = (region: string | undefined) => {
    if (!region) return <span className="text-muted-foreground">-</span>;
    const flag = REGION_FLAGS[region] || "🌍";
    return (
      <span className="flex items-center gap-1">
        <span>{flag}</span>
        <span className="text-xs">{region}</span>
      </span>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : responses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-2">
            <MessageSquare className="h-12 w-12 opacity-50" />
            <p>No responses found</p>
            <p className="text-xs">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className=" overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[45%]">Prompt</TableHead>
                    <TableHead className="w-[12%]">Platform</TableHead>
                    <TableHead className="w-[10%]">Region</TableHead>
                    <TableHead className="w-[12%]">Date</TableHead>
                    <TableHead className="w-[10%] text-center">Mentions</TableHead>
                    <TableHead className="w-[11%] text-center">Citations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow
                      key={response.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(response.id)}
                    >
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <p className="font-medium line-clamp-2" title={response.prompt_text}>
                            {response.prompt_text.length > 80
                              ? response.prompt_text.substring(0, 80) + "..."
                              : response.prompt_text}
                          </p>
                          {response.topic_name && (
                            <Badge variant="outline" className="w-fit text-xs">
                              {response.topic_name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{renderPlatformBadge(response.platform)}</TableCell>
                      <TableCell>{renderRegion(response.region)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(response.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-center">
                        {response.mentions_count > 0 ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {response.mentions_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {response.citations_count > 0 ? (
                          <Badge variant="secondary">
                            {response.citations_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
