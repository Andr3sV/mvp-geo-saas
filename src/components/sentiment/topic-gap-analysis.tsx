"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useMemo } from "react";

interface GapAnalysisData {
  topic: string;
  brand_score: number;
  best_competitor_score: number;
  avg_competitor_score: number;
  gap: number;
  best_competitor_name: string;
}

interface TopicGapAnalysisProps {
  data: GapAnalysisData[];
  isLoading?: boolean;
}

export function TopicGapAnalysis({
  data,
  isLoading,
}: TopicGapAnalysisProps) {
  // Sort by gap (largest gaps first - brand is most behind)
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.gap > 0) // Only show topics where brand is behind
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 15) // Top 15 gaps
      .map((d) => ({
        topic: d.topic,
        brand: d.brand_score,
        bestCompetitor: d.best_competitor_score,
        avgCompetitor: d.avg_competitor_score,
        gap: d.gap,
        bestCompetitorName: d.best_competitor_name,
      }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs">Brand Score:</span>
              <span className="text-xs font-medium">{data.brand.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs">Best Competitor ({data.bestCompetitorName}):</span>
              <span className="text-xs font-medium">{data.bestCompetitor.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs">Average Competitor:</span>
              <span className="text-xs font-medium">{data.avgCompetitor.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t">
              <span className="text-xs font-semibold">Gap:</span>
              <span className="text-xs font-semibold text-red-500">{data.gap.toFixed(2)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Topic Gap Analysis</CardTitle>
          <CardDescription>Topics where brand is behind competitors</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-[400px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || chartData.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Topic Gap Analysis</CardTitle>
          <CardDescription>Topics where brand is behind competitors</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            {data && data.length > 0
              ? "No topics where brand is significantly behind competitors"
              : "No gap analysis data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Topic Gap Analysis</CardTitle>
        <CardDescription>
          Priority areas for improvement. Topics where brand sentiment is below competitors.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              domain={[-1, 1]}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Sentiment Score",
                position: "insideBottom",
                offset: -5,
                style: { textAnchor: "middle", fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <YAxis
              type="category"
              dataKey="topic"
              className="text-xs"
              width={90}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="brand" fill="#3b82f6" name="Brand" radius={[0, 4, 4, 0]} />
            <Bar dataKey="bestCompetitor" fill="#ef4444" name="Best Competitor" radius={[0, 4, 4, 0]} />
            <Bar dataKey="avgCompetitor" fill="#f59e0b" name="Avg Competitor" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span>Brand</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>Best Competitor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500"></div>
            <span>Average Competitor</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

