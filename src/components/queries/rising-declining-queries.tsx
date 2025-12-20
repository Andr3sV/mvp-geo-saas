"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueryTrend {
  query: string;
  currentCount: number;
  previousCount: number;
  growth?: number;
  decline?: number;
  platforms: string[];
}

interface RisingDecliningQueriesProps {
  risingData: QueryTrend[];
  decliningData: QueryTrend[];
  isLoading?: boolean;
}

const PLATFORM_ICONS: Record<string, typeof MessageSquare> = {
  openai: MessageSquare,
  gemini: Sparkles,
};

function TrendCard({ 
  item, 
  type 
}: { 
  item: QueryTrend; 
  type: "rising" | "declining";
}) {
  const isRising = type === "rising";
  const percentage = isRising ? item.growth : item.decline;
  const Icon = isRising ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all hover:shadow-md",
        isRising
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          : "border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" title={item.query}>
            {item.query.length > 45 ? item.query.substring(0, 45) + "..." : item.query}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {item.platforms.slice(0, 2).map((platform) => {
              const PlatformIcon = PLATFORM_ICONS[platform] || MessageSquare;
              return (
                <Badge key={platform} variant="secondary" className="text-[10px] px-1.5 py-0">
                  <PlatformIcon className="h-2.5 w-2.5 mr-0.5" />
                  {platform === "openai" ? "OpenAI" : platform === "gemini" ? "Gemini" : platform}
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className={cn(
              "flex items-center gap-1 font-bold text-lg",
              isRising ? "text-emerald-600" : "text-rose-600"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{isRising ? "+" : "-"}{percentage?.toFixed(1)}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {item.previousCount} → {item.currentCount}
          </p>
        </div>
      </div>
    </div>
  );
}

export function RisingDecliningQueries({ risingData, decliningData, isLoading }: RisingDecliningQueriesProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Rising Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-rose-600" />
              Declining Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Rising Queries */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Rising Queries
            </CardTitle>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {risingData.length} queries
            </Badge>
          </div>
          <CardDescription>Queries with increasing volume</CardDescription>
        </CardHeader>
        <CardContent>
          {risingData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
              <TrendingUp className="h-10 w-10 opacity-50" />
              <p className="text-sm">No rising queries detected</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {risingData.map((item, index) => (
                <TrendCard key={`rising-${index}`} item={item} type="rising" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Declining Queries */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-rose-600" />
              Declining Queries
            </CardTitle>
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
              {decliningData.length} queries
            </Badge>
          </div>
          <CardDescription>Queries with decreasing volume</CardDescription>
        </CardHeader>
        <CardContent>
          {decliningData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
              <TrendingDown className="h-10 w-10 opacity-50" />
              <p className="text-sm">No declining queries detected</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {decliningData.map((item, index) => (
                <TrendCard key={`declining-${index}`} item={item} type="declining" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
