"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { MessageSquare, Link2, Zap, Eye, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompetitiveBattlefieldData, MomentumScoreData } from "@/lib/queries/executive-overview";

interface BattleKPIsProps {
  battlefieldData: CompetitiveBattlefieldData | null;
  momentumData: MomentumScoreData | null;
  visibilityScore: number;
  isLoading?: boolean;
}

export function BattleKPIs({ battlefieldData, momentumData, visibilityScore, isLoading }: BattleKPIsProps) {
  if (isLoading || !battlefieldData || !momentumData) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-10 bg-muted rounded w-20" />
                <div className="h-3 bg-muted rounded w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { brand } = battlefieldData;

  const kpis = [
    {
      title: "Share of Mentions",
      value: `${brand.mentionsShare.toFixed(1)}%`,
      subtitle: `#${brand.rank} of ${battlefieldData.competitors.length + 1}`,
      icon: MessageSquare,
      trend: brand.trend,
      color: brand.color || "#3B82F6",
      tooltip: "The model names a brand, person, or concept, but doesn't say where the information comes from.",
    },
    {
      title: "Share of Citations",
      value: `${brand.citationsShare.toFixed(1)}%`,
      subtitle: `${brand.citations.toLocaleString()} citations`,
      icon: Link2,
      trend: null, // We don't have citation trend in this structure
      color: "#10B981",
      tooltip: "The model names it and also states the source of that information.",
    },
    {
      title: "Momentum Score",
      value: momentumData.score > 0 ? `+${momentumData.score}` : `${momentumData.score}`,
      subtitle: momentumData.isOutperformingMarket 
        ? "Outperforming market" 
        : "Below market average",
      icon: Zap,
      trend: momentumData.velocity,
      color: momentumData.score >= 0 ? "#10B981" : "#EF4444",
      isMomentum: true,
      tooltip: "Measures how your brand's visibility is accelerating or decelerating compared to the market average.",
    },
    {
      title: "AI Visibility Index",
      value: `${visibilityScore}`,
      subtitle: "Out of 100 points",
      icon: Eye,
      trend: null,
      color: "#8B5CF6",
      isScore: true,
      tooltip: "A composite score (0-100) measuring your brand's overall presence and discoverability across AI platforms.",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {kpis.map((kpi, index) => (
        <Card 
          key={index} 
          className="border bg-card transition-all duration-300 group overflow-hidden relative"
        >
          {/* Decorative accent - full height */}
          <div 
            className="absolute top-0 left-0 w-1 h-full"
            style={{ backgroundColor: kpi.color }}
          />
          <CardContent className="pr-6 pl-5 relative">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-medium text-muted-foreground">
                  {kpi.title}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {kpi.tooltip}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${kpi.color}15` }}
              >
                <kpi.icon 
                  className="h-5 w-5" 
                  style={{ color: kpi.color }}
                />
              </div>
            </div>

            {/* Value */}
            <div className="flex items-end gap-2 mb-2">
              <span 
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  kpi.isMomentum && momentumData.score >= 0 && "text-emerald-600",
                  kpi.isMomentum && momentumData.score < 0 && "text-rose-600"
                )}
                style={!kpi.isMomentum ? { color: kpi.color } : undefined}
              >
                {kpi.value}
              </span>
              
              {/* Trend indicator */}
              {kpi.trend !== null && (
                <div className={cn(
                  "flex items-center gap-0.5 text-sm font-medium mb-1",
                  kpi.trend > 0 && "text-emerald-600",
                  kpi.trend < 0 && "text-rose-600",
                  kpi.trend === 0 && "text-muted-foreground"
                )}>
                  {kpi.trend > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : kpi.trend < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span>{kpi.trend > 0 ? "+" : ""}{kpi.trend}%</span>
                </div>
              )}
            </div>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground">
              {kpi.subtitle}
            </p>

            {/* Progress bar for visibility score */}
            {kpi.isScore && (
              <div className="mt-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${visibilityScore}%`,
                      backgroundColor: kpi.color,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Momentum bar */}
            {kpi.isMomentum && (
              <div className="mt-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                  {/* Center line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border z-10" />
                  {/* Bar */}
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 absolute top-0",
                      momentumData.score >= 0 ? "left-1/2" : "right-1/2"
                    )}
                    style={{ 
                      width: `${Math.abs(momentumData.score) / 2}%`,
                      backgroundColor: momentumData.score >= 0 ? "#10B981" : "#EF4444",
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
