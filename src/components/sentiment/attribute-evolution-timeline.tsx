"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ZAxis,
} from "recharts";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AttributeEvolutionData {
  date: string;
  attribute: string;
  frequency: number;
  type: "positive" | "negative";
}

interface AttributeEvolutionTimelineProps {
  data: AttributeEvolutionData[];
  topics?: string[];
  isLoading?: boolean;
}

export function AttributeEvolutionTimeline({
  data,
  topics = [],
  isLoading,
}: AttributeEvolutionTimelineProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [attributeType, setAttributeType] = useState<"positive" | "negative" | "both">("both");

  // Process data for chart
  const chartData = useMemo(() => {
    let filtered = data;

    if (attributeType !== "both") {
      filtered = filtered.filter((d) => d.type === attributeType);
    }

    // Get unique attributes
    const attributes = Array.from(new Set(filtered.map((d) => d.attribute))).slice(0, 20); // Top 20
    const dates = Array.from(new Set(filtered.map((d) => d.date))).sort();

    // Build scatter plot data
    const scatterData = filtered
      .filter((d) => attributes.includes(d.attribute))
      .map((d) => {
        const dateObj = new Date(d.date);
        return {
          x: dateObj.getTime(),
          y: attributes.indexOf(d.attribute),
          z: d.frequency,
          attribute: d.attribute,
          date: format(dateObj, "MMM dd, yyyy"),
          frequency: d.frequency,
          type: d.type,
        };
      });

    return { scatterData, attributes, dates };
  }, [data, attributeType]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">{data.date}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs">Attribute:</span>
              <span className="text-xs font-medium">{data.attribute}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs">Frequency:</span>
              <span className="text-xs font-medium">{data.frequency}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs">Type:</span>
              <span
                className={`text-xs font-medium ${
                  data.type === "positive" ? "text-green-600" : "text-red-600"
                }`}
              >
                {data.type}
              </span>
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
          <CardTitle>Attribute Evolution Timeline</CardTitle>
          <CardDescription>Track how attributes emerge and evolve over time</CardDescription>
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
          <CardTitle>Attribute Evolution Timeline</CardTitle>
          <CardDescription>Track how attributes emerge and evolve over time</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No attribute evolution data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Attribute Evolution Timeline</CardTitle>
        <CardDescription>
          Bubble chart showing attribute frequency over time. Bubble size = frequency.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <div className="w-48">
            <Select value={attributeType} onValueChange={(value: any) => setAttributeType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Attribute Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both (Positive & Negative)</SelectItem>
                <SelectItem value="positive">Positive Only</SelectItem>
                <SelectItem value="negative">Negative Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              dataKey="x"
              domain={["auto", "auto"]}
              tickFormatter={(value) => format(new Date(value), "MMM dd")}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Date",
                position: "insideBottom",
                offset: -5,
                style: { textAnchor: "middle", fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-1, chartData.attributes.length]}
              tickFormatter={(value) => {
                if (value >= 0 && value < chartData.attributes.length) {
                  return chartData.attributes[value];
                }
                return "";
              }}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              width={150}
              label={{
                value: "Attribute",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 400]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Scatter
              name="Positive Attributes"
              data={chartData.scatterData.filter((d) => d.type === "positive")}
              fill="#10b981"
            />
            <Scatter
              name="Negative Attributes"
              data={chartData.scatterData.filter((d) => d.type === "negative")}
              fill="#ef4444"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

