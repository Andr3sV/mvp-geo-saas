"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface RegionalData {
  region: string;
  entity_name: string;
  entity_type: "brand" | "competitor";
  competitor_id: string | null;
  avg_sentiment_score: number;
  evaluation_count: number;
}

interface RegionalSentimentComparisonProps {
  data: RegionalData[];
  entityType?: "brand" | "competitor" | "all";
  isLoading?: boolean;
}

export function RegionalSentimentComparison({
  data,
  entityType = "all",
  isLoading,
}: RegionalSentimentComparisonProps) {
  // Process data for chart
  const chartData = useMemo(() => {
    const filtered = entityType !== "all" ? data.filter((d) => d.entity_type === entityType) : data;

    // Group by region and entity
    const byRegion = new Map<string, Map<string, number>>();
    const entities = new Set<string>();

    filtered.forEach((d) => {
      const region = d.region || "GLOBAL";
      if (!byRegion.has(region)) {
        byRegion.set(region, new Map());
      }
      byRegion.get(region)!.set(d.entity_name, d.avg_sentiment_score);
      entities.add(d.entity_name);
    });

    // Build chart data
    const regions = Array.from(byRegion.keys()).sort();
    const entityList = Array.from(entities);

    return regions.map((region) => {
      const dataPoint: any = { region };
      const regionData = byRegion.get(region)!;
      entityList.forEach((entity) => {
        dataPoint[entity] = regionData.get(entity) ?? null;
      });
      return dataPoint;
    });
  }, [data, entityType]);

  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
  ];

  const entities = useMemo(() => {
    const filtered = entityType !== "all" ? data.filter((d) => d.entity_type === entityType) : data;
    return Array.from(new Set(filtered.map((d) => d.entity_name)));
  }, [data, entityType]);

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Regional Sentiment Comparison</CardTitle>
          <CardDescription>Compare sentiment across different regions</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-[400px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Regional Sentiment Comparison</CardTitle>
          <CardDescription>Compare sentiment across different regions</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No regional data available</p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs">{entry.name}</span>
                </div>
                <span className="text-xs font-medium">
                  {entry.value !== null ? entry.value.toFixed(2) : "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Regional Sentiment Comparison</CardTitle>
        <CardDescription>
          Average sentiment scores by region {entityType !== "all" && `(${entityType})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="region"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              domain={[-1, 1]}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Sentiment Score",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {entities.map((entity, index) => (
              <Bar
                key={entity}
                dataKey={entity}
                fill={colors[index % colors.length]}
                name={entity}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

