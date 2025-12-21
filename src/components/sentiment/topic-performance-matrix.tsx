"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

interface TopicPerformanceData {
  topic: string;
  entity_name: string;
  entity_type: "brand" | "competitor";
  competitor_id: string | null;
  avg_sentiment_score: number;
  evaluation_count: number;
}

interface TopicPerformanceMatrixProps {
  data: TopicPerformanceData[];
  isLoading?: boolean;
}

export function TopicPerformanceMatrix({
  data,
  isLoading,
}: TopicPerformanceMatrixProps) {
  // Process data for heatmap
  const heatmapData = useMemo(() => {
    // Get unique topics and entities
    const topics = Array.from(new Set(data.map((d) => d.topic))).slice(0, 20); // Limit to top 20 topics
    const entities = Array.from(new Set(data.map((d) => d.entity_name)));

    // Create a map for quick lookups
    const scoreMap = new Map<string, number>();
    data.forEach((d) => {
      const key = `${d.topic}|${d.entity_name}`;
      scoreMap.set(key, d.avg_sentiment_score);
    });

    // Build heatmap cells
    const cells: Array<{
      topic: string;
      entity: string;
      score: number;
      x: number;
      y: number;
    }> = [];

    topics.forEach((topic, topicIdx) => {
      entities.forEach((entity, entityIdx) => {
        const key = `${topic}|${entity}`;
        const score = scoreMap.get(key) ?? 0;

        cells.push({
          topic,
          entity,
          score,
          x: topicIdx,
          y: entityIdx,
        });
      });
    });

    return { cells, topics, entities };
  }, [data]);

  // Color scale: red (-1) -> yellow (0) -> green (1)
  const getColor = (score: number) => {
    if (score >= 0) {
      // Positive: yellow to green
      const intensity = Math.min(score, 1);
      const green = Math.round(100 + intensity * 155);
      return `rgb(255, ${255 - Math.round(intensity * 155)}, 0)`;
    } else {
      // Negative: red to yellow
      const intensity = Math.min(Math.abs(score), 1);
      const red = 255;
      const green = Math.round(intensity * 255);
      return `rgb(${red}, ${green}, 0)`;
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Topic Performance Matrix</CardTitle>
          <CardDescription>Heatmap showing sentiment scores by topic and entity</CardDescription>
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
          <CardTitle>Topic Performance Matrix</CardTitle>
          <CardDescription>Heatmap showing sentiment scores by topic and entity</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No evaluation data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Topic Performance Matrix</CardTitle>
        <CardDescription>
          Heatmap showing sentiment scores across topics. Green = positive, Yellow = neutral, Red = negative
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="w-full">
          {/* Legend */}
          <div className="mb-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span>Negative (-1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span>Neutral (0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span>Positive (1)</span>
            </div>
          </div>

          {/* Heatmap Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-background z-10 p-2 text-left border-r border-b">
                    Entity
                  </th>
                  {heatmapData.topics.map((topic) => (
                    <th
                      key={topic}
                      className="p-2 text-xs border-b border-r whitespace-nowrap min-w-[120px]"
                      title={topic}
                    >
                      <div className="transform -rotate-45 origin-left">{topic}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.entities.map((entity) => (
                  <tr key={entity}>
                    <td className="sticky left-0 bg-background z-10 p-2 border-r border-b font-medium">
                      {entity}
                    </td>
                    {heatmapData.topics.map((topic) => {
                      const cell = heatmapData.cells.find(
                        (c) => c.topic === topic && c.entity === entity
                      );
                      const score = cell?.score ?? 0;
                      const color = getColor(score);

                      return (
                        <td
                          key={`${entity}-${topic}`}
                          className="p-2 border-r border-b text-center"
                          style={{ backgroundColor: color }}
                          title={`${entity} - ${topic}: ${score.toFixed(2)}`}
                        >
                          <span
                            className={`text-xs font-medium ${
                              Math.abs(score) > 0.3 ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {score.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

