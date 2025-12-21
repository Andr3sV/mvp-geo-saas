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
      // Red: rgb(255, 140, 140) -> Yellow: rgb(255, 235, 150)
      const intensity = Math.abs(clampedScore); // 0 to 1
      const easedIntensity = Math.pow(intensity, 0.8);
      
      // Balanced transition from red to yellow
      const r = 255; // Always 255 for both red and yellow
      const g = Math.round(140 + (easedIntensity * 95)); // 140 to 235
      const b = Math.round(140 + (easedIntensity * 10)); // 140 to 150
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
          Heatmap showing sentiment scores across categories.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-6">
        <div className="w-full">
          {/* Legend */}
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md shadow-sm border border-border/50" style={{ backgroundColor: getColor(-1) }}></div>
              <span className="font-medium">Negative (-1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md shadow-sm border border-border/50" style={{ backgroundColor: getColor(0) }}></div>
              <span className="font-medium">Neutral (0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md shadow-sm border border-border/50" style={{ backgroundColor: getColor(0.5) }}></div>
              <span className="font-medium">Positive (0.5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md shadow-sm border border-border/50" style={{ backgroundColor: getColor(1) }}></div>
              <span className="font-medium">Positive (1)</span>
            </div>
          </div>

          {/* Heatmap Table */}
          <div className="overflow-x-auto rounded-lg border border-border bg-background shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="sticky left-0 bg-muted/30 z-20 px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-b border-border">
                    Entity
                  </th>
                  {heatmapData.topics.map((topic) => (
                    <th
                      key={topic}
                      className="px-3 py-3 text-xs font-semibold text-foreground border-b border-r border-border min-w-[90px] max-w-[110px] bg-muted/30"
                      title={topic}
                    >
                      <div className="leading-tight break-words">{topic}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.entities.map((entity, entityIdx) => {
                  const entityDomain = getEntityDomain(entity);
                  
                  return (
                    <tr 
                      key={entity} 
                      className={entityIdx % 2 === 0 ? "bg-muted/40" : "bg-muted/30"}
                    >
                      <td className="sticky left-0 z-10 px-4 py-3 text-sm font-semibold text-foreground border-r border-b border-border bg-inherit">
                        <div className="flex items-center gap-2">
                          <BrandLogo domain={entityDomain} name={entity} size={20} className="flex-shrink-0" />
                          <span>{entity}</span>
                        </div>
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
                          className="px-3 py-3 text-center border-r border-b border-border/50 group relative"
                          style={{ backgroundColor: color }}
                          title={`${entity} - ${topic}: ${score.toFixed(2)}`}
                        >
                          <span className="text-sm font-semibold text-gray-900 transition-opacity group-hover:opacity-80">
                            {score.toFixed(2)}
                          </span>
                          {/* Subtle hover effect */}
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </td>
                      );
                    })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

