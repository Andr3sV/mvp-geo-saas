"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, MessageSquare, Sparkles, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergingQuery {
  query: string;
  count: number;
  firstSeen: string;
  platforms: string[];
}

interface EmergingQueriesTimelineProps {
  data: EmergingQuery[];
  isLoading?: boolean;
}

const PLATFORM_ICONS: Record<string, typeof MessageSquare> = {
  openai: MessageSquare,
  gemini: Sparkles,
};

export function EmergingQueriesTimeline({ data, isLoading }: EmergingQueriesTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            Emerging Queries
          </CardTitle>
          <CardDescription>New queries that appeared this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
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
            <Zap className="h-5 w-5 text-muted-foreground" />
            Emerging Queries
          </CardTitle>
          <CardDescription>New queries that appeared this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Zap className="h-12 w-12 opacity-50" />
            <p>No new queries detected</p>
            <p className="text-xs">New queries will appear when AI models use new search patterns</p>
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
              <Zap className="h-5 w-5 text-muted-foreground" />
              Emerging Queries
            </CardTitle>
            <CardDescription>New queries that appeared this period</CardDescription>
          </div>
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            {data.length} new
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-purple-400 to-transparent" />

          {/* Timeline items */}
          <div className="space-y-4 pl-10">
            {data.map((item, index) => (
              <div
                key={`${item.query}-${index}`}
                className={cn(
                  "relative rounded-lg border p-4 transition-all hover:shadow-md",
                  "border-purple-200 bg-purple-50/30 dark:border-purple-900/50 dark:bg-purple-950/10"
                )}
              >
                {/* Timeline dot */}
                <div className="absolute -left-[26px] top-4 h-3 w-3 rounded-full bg-purple-500 border-2 border-background" />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" title={item.query}>
                      {item.query.length > 50 ? item.query.substring(0, 50) + "..." : item.query}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{item.firstSeen}</span>
                      </div>
                      <span>•</span>
                      <span>{item.count} occurrences</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {item.platforms.slice(0, 2).map((platform) => {
                        const Icon = PLATFORM_ICONS[platform] || MessageSquare;
                        return (
                          <Badge key={platform} variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Icon className="h-2.5 w-2.5 mr-0.5" />
                            {platform === "openai" ? "OpenAI" : platform === "gemini" ? "Gemini" : platform}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                        NEW
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
