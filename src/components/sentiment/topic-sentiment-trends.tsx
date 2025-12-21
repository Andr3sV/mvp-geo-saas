"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TopicTrendData {
  date: string;
  topic: string;
  avg_sentiment_score: number;
  evaluation_count: number;
}

interface TopicSentimentTrendsProps {
  data: TopicTrendData[];
  isLoading?: boolean;
}

export function TopicSentimentTrends({
  data,
  isLoading,
}: TopicSentimentTrendsProps) {
  const [visibleTopics, setVisibleTopics] = useState<Set<string>>(new Set());

  // Process data for chart
  const { chartData, topics } = useMemo(() => {
    // Get unique topics
    const uniqueTopics = Array.from(new Set(data.map((d) => d.topic))).slice(0, 10); // Top 10 topics

    // Initialize visible topics (show all by default)
    if (visibleTopics.size === 0 && uniqueTopics.length > 0) {
      setVisibleTopics(new Set(uniqueTopics.slice(0, 5))); // Show top 5 by default
    }

    // Get all unique dates
    const dates = Array.from(new Set(data.map((d) => d.date))).sort();

    // Build chart data
    const chart = dates.map((date) => {
      const dataPoint: any = { date: format(new Date(date), "MMM dd") };

      uniqueTopics.forEach((topic) => {
        const topicData = data.find((d) => d.date === date && d.topic === topic);
        if (topicData) {
          dataPoint[topic] = topicData.avg_sentiment_score;
        }
      });

      return dataPoint;
    });

    return { chartData: chart, topics: uniqueTopics };
  }, [data, visibleTopics]);

  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
    "#6366f1", // indigo
  ];

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Topic Sentiment Trends</CardTitle>
          <CardDescription>Track sentiment evolution by topic over time</CardDescription>
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
          <CardTitle>Topic Sentiment Trends</CardTitle>
          <CardDescription>Track sentiment evolution by topic over time</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No trend data available</p>
        </CardContent>
      </Card>
    );
  }

  const toggleTopic = (topic: string) => {
    const newVisible = new Set(visibleTopics);
    if (newVisible.has(topic)) {
      newVisible.delete(topic);
    } else {
      newVisible.add(topic);
    }
    setVisibleTopics(newVisible);
  };

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
                  <span className="text-xs">{entry.dataKey}</span>
                </div>
                <span className="text-xs font-medium">
                  {typeof entry.value === "number" ? entry.value.toFixed(2) : "N/A"}
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
        <CardTitle>Topic Sentiment Trends</CardTitle>
        <CardDescription>
          Track how sentiment evolves for different topics over time (Score: -1 to 1)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {/* Topic Toggle Checkboxes */}
        <div className="mb-4 flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg">
          {topics.map((topic, index) => (
            <div key={topic} className="flex items-center space-x-2">
              <Checkbox
                id={`topic-${topic}`}
                checked={visibleTopics.has(topic)}
                onCheckedChange={() => toggleTopic(topic)}
              />
              <Label
                htmlFor={`topic-${topic}`}
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                {topic}
              </Label>
            </div>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
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
            {topics.map((topic, index) => {
              if (!visibleTopics.has(topic)) return null;
              return (
                <Line
                  key={topic}
                  type="monotone"
                  dataKey={topic}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

