"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Grid3X3, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants/platforms";

interface Entity {
  id: string;
  name: string;
  domain: string;
  mentions: number;
  percentage: number;
  isBrand: boolean;
}

interface PlatformPerformanceHeatmapProps {
  openaiData: { entities: Entity[]; totalMentions: number };
  geminiData: { entities: Entity[]; totalMentions: number };
  isLoading?: boolean;
}

export function PlatformPerformanceHeatmap({ openaiData, geminiData, isLoading }: PlatformPerformanceHeatmapProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            Platform Performance Heatmap
          </CardTitle>
          <CardDescription>Brand and competitor mentions per platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get all unique entities from both platforms
  const entityMap = new Map<string, { name: string; domain: string; isBrand: boolean; openai: number; gemini: number }>();

  openaiData.entities.forEach((e) => {
    entityMap.set(e.id, {
      name: e.name,
      domain: e.domain,
      isBrand: e.isBrand,
      openai: e.mentions,
      gemini: 0,
    });
  });

  geminiData.entities.forEach((e) => {
    const existing = entityMap.get(e.id);
    if (existing) {
      existing.gemini = e.mentions;
    } else {
      entityMap.set(e.id, {
        name: e.name,
        domain: e.domain,
        isBrand: e.isBrand,
        openai: 0,
        gemini: e.mentions,
      });
    }
  });

  // Convert to array and sort by total mentions
  const entities = Array.from(entityMap.entries())
    .map(([id, data]) => ({ id, ...data, total: data.openai + data.gemini }))
    .sort((a, b) => {
      // Brand first, then by total
      if (a.isBrand && !b.isBrand) return -1;
      if (!a.isBrand && b.isBrand) return 1;
      return b.total - a.total;
    });

  // Find max for color intensity
  const maxMentions = Math.max(
    ...entities.map((e) => Math.max(e.openai, e.gemini)),
    1
  );

  // Get color intensity based on value
  const getIntensity = (value: number, platform: "openai" | "gemini") => {
    const intensity = value / maxMentions;
    const baseColor = platform === "openai" ? "16, 185, 129" : "59, 130, 246"; // emerald : blue RGB
    return `rgba(${baseColor}, ${Math.max(0.1, intensity * 0.8)})`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-muted-foreground" />
          Platform Performance Heatmap
        </CardTitle>
        <CardDescription>Brand and competitor mentions per platform (color intensity = volume)</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="grid grid-cols-[1fr,120px,120px] gap-2 mb-2">
          <div className="text-xs font-medium text-muted-foreground px-2">Entity</div>
          <div className="flex items-center justify-center gap-1 text-xs font-medium" style={{ color: PLATFORMS.openai.color }}>
            <MessageSquare className="h-3 w-3" />
            OpenAI
          </div>
          <div className="flex items-center justify-center gap-1 text-xs font-medium" style={{ color: PLATFORMS.gemini.color }}>
            <Sparkles className="h-3 w-3" />
            Gemini
          </div>
        </div>

        {/* Data rows */}
        <div className="space-y-1">
          {entities.slice(0, 10).map((entity) => (
            <div key={entity.id} className="grid grid-cols-[1fr,120px,120px] gap-2">
              {/* Entity name */}
              <div className="flex items-center gap-2 px-2 py-2">
                <BrandLogo domain={entity.domain || entity.name} name={entity.name} size={18} />
                <span className={cn("text-sm truncate", entity.isBrand && "font-semibold")}>
                  {entity.name}
                </span>
                {entity.isBrand && (
                  <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-primary/10 text-primary flex-shrink-0">
                    You
                  </span>
                )}
              </div>

              {/* OpenAI cell */}
              <div
                className="flex items-center justify-center py-2 rounded-md text-sm font-semibold tabular-nums transition-colors"
                style={{ backgroundColor: getIntensity(entity.openai, "openai") }}
              >
                {entity.openai.toLocaleString()}
              </div>

              {/* Gemini cell */}
              <div
                className="flex items-center justify-center py-2 rounded-md text-sm font-semibold tabular-nums transition-colors"
                style={{ backgroundColor: getIntensity(entity.gemini, "gemini") }}
              >
                {entity.gemini.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing top {Math.min(entities.length, 10)} entities</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-8 h-2 rounded" style={{ background: `linear-gradient(to right, rgba(16,185,129,0.1), rgba(16,185,129,0.8))` }} />
              <span>OpenAI intensity</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-2 rounded" style={{ background: `linear-gradient(to right, rgba(59,130,246,0.1), rgba(59,130,246,0.8))` }} />
              <span>Gemini intensity</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
