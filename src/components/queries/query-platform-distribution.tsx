"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Sparkles, BarChart3 } from "lucide-react";
import { PLATFORMS } from "@/lib/constants/platforms";

interface QueryData {
  query: string;
  count: number;
}

interface QueryPlatformDistributionProps {
  openaiData: QueryData[];
  geminiData: QueryData[];
  isLoading?: boolean;
}

function PlatformColumn({ 
  platform, 
  data, 
  maxCount 
}: { 
  platform: "openai" | "gemini"; 
  data: QueryData[]; 
  maxCount: number;
}) {
  const config = PLATFORMS[platform];
  const Icon = platform === "openai" ? MessageSquare : Sparkles;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5" style={{ color: config.color }} />
        <span className="font-semibold" style={{ color: config.color }}>{config.name}</span>
        <span className="text-xs text-muted-foreground">
          ({data.reduce((sum, d) => sum + d.count, 0)} total)
        </span>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No queries</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => {
            const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            return (
              <div key={`${item.query}-${index}`} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 pr-2" title={item.query}>
                    {item.query.length > 35 ? item.query.substring(0, 35) + "..." : item.query}
                  </span>
                  <span className="font-semibold tabular-nums text-xs">{item.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, backgroundColor: config.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function QueryPlatformDistribution({ openaiData, geminiData, isLoading }: QueryPlatformDistributionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Query Distribution by Platform
          </CardTitle>
          <CardDescription>Top search queries per AI platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find max count for scaling bars
  const allCounts = [...openaiData.map((d) => d.count), ...geminiData.map((d) => d.count)];
  const maxCount = Math.max(...allCounts, 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          Query Distribution by Platform
        </CardTitle>
        <CardDescription>Top search queries per AI platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <PlatformColumn platform="openai" data={openaiData} maxCount={maxCount} />
          <PlatformColumn platform="gemini" data={geminiData} maxCount={maxCount} />
        </div>
      </CardContent>
    </Card>
  );
}
