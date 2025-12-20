"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants/platforms";

interface TopicData {
  id: string;
  name: string;
  openai: number;
  gemini: number;
  total: number;
}

interface TopicPerformanceByPlatformProps {
  data: TopicData[];
  isLoading?: boolean;
}

export function TopicPerformanceByPlatform({ data, isLoading }: TopicPerformanceByPlatformProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="h-5 w-5 text-muted-foreground" />
            Topic Performance by Platform
          </CardTitle>
          <CardDescription>Your brand mentions per topic on each platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
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
            <Tag className="h-5 w-5 text-muted-foreground" />
            Topic Performance by Platform
          </CardTitle>
          <CardDescription>Your brand mentions per topic on each platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Tag className="h-8 w-8 opacity-50" />
            <p>No topics configured</p>
            <p className="text-xs">Add topics in Settings to see performance breakdown</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find max for color intensity
  const maxMentions = Math.max(...data.map((t) => Math.max(t.openai, t.gemini)), 1);

  // Get color intensity
  const getIntensity = (value: number, platform: "openai" | "gemini") => {
    const intensity = value / maxMentions;
    const baseColor = platform === "openai" ? "16, 185, 129" : "59, 130, 246";
    return `rgba(${baseColor}, ${Math.max(0.1, intensity * 0.8)})`;
  };

  // Find best platform for each topic
  const getBestPlatform = (topic: TopicData) => {
    if (topic.openai > topic.gemini) return "openai";
    if (topic.gemini > topic.openai) return "gemini";
    return "equal";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="h-5 w-5 text-muted-foreground" />
          Topic Performance by Platform
        </CardTitle>
        <CardDescription>Your brand mentions per topic on each platform</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="grid grid-cols-[1fr,100px,100px,80px] gap-2 mb-2 pb-2 border-b">
          <div className="text-xs font-medium text-muted-foreground">Topic</div>
          <div className="flex items-center justify-center gap-1 text-xs font-medium" style={{ color: PLATFORMS.openai.color }}>
            <MessageSquare className="h-3 w-3" />
            OpenAI
          </div>
          <div className="flex items-center justify-center gap-1 text-xs font-medium" style={{ color: PLATFORMS.gemini.color }}>
            <Sparkles className="h-3 w-3" />
            Gemini
          </div>
          <div className="text-xs font-medium text-muted-foreground text-center">Best</div>
        </div>

        {/* Data rows */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {data.map((topic) => {
            const bestPlatform = getBestPlatform(topic);
            return (
              <div key={topic.id} className="grid grid-cols-[1fr,100px,100px,80px] gap-2 py-1.5">
                {/* Topic name */}
                <div className="flex items-center">
                  <span className="text-sm truncate">{topic.name}</span>
                </div>

                {/* OpenAI cell */}
                <div
                  className="flex items-center justify-center py-1.5 rounded text-sm font-semibold tabular-nums"
                  style={{ backgroundColor: getIntensity(topic.openai, "openai") }}
                >
                  {topic.openai.toLocaleString()}
                </div>

                {/* Gemini cell */}
                <div
                  className="flex items-center justify-center py-1.5 rounded text-sm font-semibold tabular-nums"
                  style={{ backgroundColor: getIntensity(topic.gemini, "gemini") }}
                >
                  {topic.gemini.toLocaleString()}
                </div>

                {/* Best platform indicator */}
                <div className="flex items-center justify-center">
                  {bestPlatform === "openai" && (
                    <div className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600">
                      OpenAI
                    </div>
                  )}
                  {bestPlatform === "gemini" && (
                    <div className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600">
                      Gemini
                    </div>
                  )}
                  {bestPlatform === "equal" && (
                    <div className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                      Equal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>{data.length} topics analyzed</span>
          <div className="flex items-center gap-3">
            <span>
              OpenAI leads: {data.filter((t) => t.openai > t.gemini).length}
            </span>
            <span>
              Gemini leads: {data.filter((t) => t.gemini > t.openai).length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
