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
  // More realistic and smooth color mapping with earlier green transition
  const getColor = (score: number) => {
    // Clamp score between -1 and 1
    const clampedScore = Math.max(-1, Math.min(1, score));
    
    if (clampedScore >= 0) {
      // Positive: yellow (255,255,150) to green (34,197,94)
      // Use a smoother curve that transitions to green earlier
      const intensity = clampedScore; // 0 to 1
      // Apply a power curve to make transition smoother and earlier
      const easedIntensity = Math.pow(intensity, 0.7);
      
      const r = Math.round(255 - (easedIntensity * 221)); // 255 to 34
      const g = Math.round(255 - (easedIntensity * 58)); // 255 to 197
      const b = Math.round(150 - (easedIntensity * 56)); // 150 to 94
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Negative: red (239,68,68) to yellow (255,255,150)
      const intensity = Math.abs(clampedScore); // 0 to 1
      const easedIntensity = Math.pow(intensity, 0.8);
      
      const r = Math.round(239 + (easedIntensity * 16)); // 239 to 255
      const g = Math.round(68 + (easedIntensity * 187)); // 68 to 255
      const b = Math.round(68 + (easedIntensity * 82)); // 68 to 150
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Sentiment Category Performance Matrix</CardTitle>
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
          <CardTitle>Sentiment Category Matrix</CardTitle>
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
        <CardTitle>Sentiment Category Performance Matrix</CardTitle>
        <CardDescription>
          Heatmap showing sentiment scores across categories. Green = positive, Yellow = neutral, Red = negative
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="w-full">
          {/* Legend */}
          <div className="mb-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getColor(-1) }}></div>
              <span>Negative (-1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getColor(0) }}></div>
              <span>Neutral (0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getColor(0.5) }}></div>
              <span>Positive (0.5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getColor(1) }}></div>
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
                      className="p-2 text-xs border-b border-r min-w-[80px] max-w-[100px]"
                      title={topic}
                    >
                      <div className="leading-tight break-words">{topic}</div>
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
                              Math.abs(score) > 0.5 ? "text-white" : "text-gray-800"
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

