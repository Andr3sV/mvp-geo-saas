"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
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
  brandDomain?: string;
  competitors?: Array<{ id: string; name: string; domain?: string }>;
}

export function TopicPerformanceMatrix({
  data,
  isLoading,
  brandDomain,
  competitors = [],
}: TopicPerformanceMatrixProps) {
  // Process data for heatmap
  const heatmapData = useMemo(() => {
    // Get unique topics and entities
    const topics = Array.from(new Set(data.map((d) => d.topic))).slice(0, 20); // Limit to top 20 topics
    const entities = Array.from(new Set(data.map((d) => d.entity_name)));

    // Create a map for quick lookups
    const scoreMap = new Map<string, number>();
    const entityTypeMap = new Map<string, "brand" | "competitor">();
    const entityCompetitorIdMap = new Map<string, string | null>();
    
    data.forEach((d) => {
      const key = `${d.topic}|${d.entity_name}`;
      scoreMap.set(key, d.avg_sentiment_score);
      entityTypeMap.set(d.entity_name, d.entity_type);
      entityCompetitorIdMap.set(d.entity_name, d.competitor_id);
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

    return { cells, topics, entities, entityTypeMap, entityCompetitorIdMap };
  }, [data]);

  // Get domain for an entity
  const getEntityDomain = (entityName: string): string => {
    const entityType = heatmapData.entityTypeMap.get(entityName);
    if (entityType === "brand") {
      return brandDomain || entityName;
    } else {
      const competitorId = heatmapData.entityCompetitorIdMap.get(entityName);
      const competitor = competitors.find(c => c.id === competitorId);
      return competitor?.domain || competitor?.name || entityName;
    }
  };

  // Color scale: red (-1) -> yellow (0) -> green (1)
  // Balanced colors - not too pastel, not too intense - with smooth transitions
  const getColor = (score: number) => {
    // Clamp score between -1 and 1
    const clampedScore = Math.max(-1, Math.min(1, score));
    
    if (clampedScore >= 0) {
      // Positive: yellow to green with balanced saturation
      // Yellow: rgb(255, 235, 150) -> Green: rgb(100, 220, 120)
      const intensity = clampedScore; // 0 to 1
      const easedIntensity = Math.pow(intensity, 0.7);
      
      // Balanced transition from yellow to green
      const r = Math.round(255 - (easedIntensity * 155)); // 255 to 100
      const g = Math.round(235 - (easedIntensity * 15)); // 235 to 220
      const b = Math.round(150 - (easedIntensity * 30)); // 150 to 120
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Negative: red to yellow with balanced saturation
      // Red: rgb(255, 140, 140) when score = -1 -> Yellow: rgb(255, 235, 150) when score = 0
      const intensity = Math.abs(clampedScore); // 0 to 1 (1 when score = -1, 0 when score = 0)
      const easedIntensity = Math.pow(intensity, 0.8);
      
      // Balanced transition from red (when intensity = 1) to yellow (when intensity = 0)
      const r = 255; // Always 255 for both red and yellow
      const g = Math.round(235 - (easedIntensity * 95)); // 235 (yellow) to 140 (red)
      const b = Math.round(150 - (easedIntensity * 10)); // 150 (yellow) to 140 (red)
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
          Sentiment scores across categories and entities (color intensity = sentiment score)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground border-b">
                  Sentiment Category
                </th>
                {heatmapData.entities.map((entity) => {
                  const entityDomain = getEntityDomain(entity);
                  return (
                    <th key={entity} className="p-2 text-center border-b min-w-[80px]">
                      <div className="flex flex-col items-center gap-1">
                        <BrandLogo domain={entityDomain} name={entity} size={20} />
                        <span className="text-[9px] text-muted-foreground truncate max-w-[70px]" title={entity}>
                          {entity.length > 12 ? entity.substring(0, 12) + "..." : entity}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {heatmapData.topics.map((topic, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="hover:bg-muted/20">
                  <td className="p-2 text-xs border-b max-w-[200px] truncate" title={topic}>
                    {topic.length > 35 ? topic.substring(0, 35) + "..." : topic}
                  </td>
                  {heatmapData.entities.map((entity) => {
                    const cell = heatmapData.cells.find(
                      (c) => c.topic === topic && c.entity === entity
                    );
                    const score = cell?.score ?? 0;
                    const color = getColor(score);
                    
                    // Determine text color based on background brightness
                    const textColor = Math.abs(score) > 0.5 ? "white" : "text-gray-900";

                    return (
                      <td
                        key={`${topic}-${entity}`}
                        className="p-1 text-center border-b"
                      >
                        <div
                          className="mx-auto w-12 h-10 rounded flex items-center justify-center text-xs font-semibold transition-colors"
                          style={{
                            backgroundColor: score !== 0 ? color : "transparent",
                            color: score !== 0 && Math.abs(score) > 0.5 ? "white" : score !== 0 ? "#1e293b" : "transparent",
                          }}
                          title={`${entity} - ${topic}: ${score.toFixed(2)}`}
                        >
                          {score !== 0 ? score.toFixed(2) : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Top {heatmapData.topics.length} categories × {heatmapData.entities.length} entities</span>
          <div className="flex items-center gap-2">
            <span>Negative</span>
            <div className="flex items-center gap-0.5">
              <div className="w-4 h-3 rounded" style={{ backgroundColor: getColor(-1) }} />
              <div className="w-4 h-3 rounded" style={{ backgroundColor: getColor(-0.66) }} />
              <div className="w-4 h-3 rounded" style={{ backgroundColor: getColor(-0.33) }} />
              <div className="w-4 h-3 rounded" style={{ backgroundColor: getColor(0) }} />
              <div className="w-4 h-3 rounded" style={{ backgroundColor: getColor(0.33) }} />
              <div className="w-4 h-3 rounded" style={{ backgroundColor: getColor(0.66) }} />
              <div className="w-4 h-3 rounded" style={{ backgroundColor: getColor(1) }} />
            </div>
            <span>Positive</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

