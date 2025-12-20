"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud } from "lucide-react";

interface WordCloudData {
  text: string;
  value: number;
}

interface QueryWordCloudProps {
  data: WordCloudData[];
  isLoading?: boolean;
}

// Color palette for words
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
];

export function QueryWordCloud({ data, isLoading }: QueryWordCloudProps) {
  // Calculate font sizes based on value
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const maxValue = Math.max(...data.map((d) => d.value));
    const minValue = Math.min(...data.map((d) => d.value));
    const range = maxValue - minValue || 1;

    return data.slice(0, 50).map((item, index) => {
      // Scale font size between 12 and 48px
      const normalized = (item.value - minValue) / range;
      const fontSize = 12 + normalized * 36;
      const opacity = 0.6 + normalized * 0.4;

      return {
        ...item,
        fontSize,
        opacity,
        color: COLORS[index % COLORS.length],
      };
    });
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5 text-muted-foreground" />
            Query Word Cloud
          </CardTitle>
          <CardDescription>Most frequent search queries used by AI models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
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
            <Cloud className="h-5 w-5 text-muted-foreground" />
            Query Word Cloud
          </CardTitle>
          <CardDescription>Most frequent search queries used by AI models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Cloud className="h-12 w-12 opacity-50" />
            <p>No query data available</p>
            <p className="text-xs">Queries will appear as AI models perform web searches</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              Query Word Cloud
            </CardTitle>
            <CardDescription>Most frequent search queries used by AI models</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">{data.length}</p>
            <p className="text-xs text-muted-foreground">unique queries</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] overflow-hidden relative">
          {/* Gradient overlay for fade effect */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
          </div>

          {/* Word Cloud */}
          <div className="flex flex-wrap items-center justify-center gap-3 p-4 h-full overflow-y-auto scrollbar-hide">
            {processedData.map((item, index) => (
              <span
                key={`${item.text}-${index}`}
                className="inline-block cursor-default transition-all duration-200 hover:scale-110 hover:z-20"
                style={{
                  fontSize: `${item.fontSize}px`,
                  color: item.color,
                  opacity: item.opacity,
                  lineHeight: 1.2,
                }}
                title={`"${item.text}" - ${item.value} occurrences`}
              >
                {item.text.length > 40 ? item.text.substring(0, 40) + "..." : item.text}
              </span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Larger text = higher frequency</span>
          <span>Hover over queries to see details</span>
        </div>
      </CardContent>
    </Card>
  );
}
