"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformCardProps {
  platform: {
    id: string;
    name: string;
    color: string;
    bgColor: string;
    textColor: string;
    mentions: number;
    citations: number;
    share: number;
    trend: number;
  };
  isLoading?: boolean;
}

const PLATFORM_ICONS: Record<string, typeof MessageSquare> = {
  openai: MessageSquare,
  gemini: Sparkles,
};

export function PlatformCard({ platform, isLoading }: PlatformCardProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-muted animate-pulse" />
        <CardContent className="pt-6 pb-5">
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="h-8 w-16 bg-muted rounded" />
                <div className="h-3 w-12 bg-muted rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-8 w-20 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = PLATFORM_ICONS[platform.id] || MessageSquare;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Colored top bar */}
      <div 
        className="h-1.5" 
        style={{ backgroundColor: platform.color }}
      />
      
      <CardContent className="pt-6 pb-5">
        {/* Header with icon and name */}
        <div className="flex items-center gap-3 mb-5">
          <div 
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              platform.bgColor
            )}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className={cn("text-lg font-semibold", platform.textColor)}>
              {platform.name}
            </h3>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Share */}
          <div>
            <p className="text-3xl font-bold tabular-nums">{platform.share}%</p>
            <p className="text-xs text-muted-foreground">market share</p>
          </div>

          {/* Mentions */}
          <div>
            <p className="text-3xl font-bold tabular-nums">{platform.mentions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">mentions</p>
          </div>
        </div>

        {/* Trend */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Trend</span>
            <div className={cn(
              "flex items-center gap-1 text-sm font-semibold",
              platform.trend > 0 ? "text-emerald-600" : platform.trend < 0 ? "text-rose-600" : "text-muted-foreground"
            )}>
              {platform.trend > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : platform.trend < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : null}
              <span>{platform.trend > 0 ? "+" : ""}{platform.trend}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
