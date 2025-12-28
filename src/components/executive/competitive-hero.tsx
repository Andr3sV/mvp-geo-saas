"use client";

import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TrendingUp, TrendingDown, Minus, Crown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompetitiveBattlefieldData } from "@/lib/queries/executive-overview";

interface CompetitiveHeroProps {
  data: CompetitiveBattlefieldData | null;
  isLoading?: boolean;
}

export function CompetitiveHero({ data, isLoading }: CompetitiveHeroProps) {
  if (isLoading || !data) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-background">
        {/* Background gradients matching landing page */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#C2C2E1]/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(194,194,225,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(194,194,225,0.2),transparent_50%)]" />
        <div className="relative p-8">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2C2E1]" />
          </div>
        </div>
      </div>
    );
  }

  const { brand, leader, gapToLeader, positionChange } = data;
  const isLeader = brand.rank === 1;
  const closestCompetitor = data.competitors[0];

  // Determine status message
  let statusMessage = "";
  let statusType: "success" | "warning" | "neutral" = "neutral";

  if (isLeader) {
    statusMessage = `Leading the market with ${brand.mentionsShare.toFixed(1)}% Share of Mentions`;
    statusType = "success";
  } else if (brand.rank <= 3) {
    statusMessage = `${gapToLeader.toFixed(1)} points behind ${leader.name}`;
    statusType = "warning";
  } else {
    statusMessage = `${gapToLeader.toFixed(1)} points to reach market leader`;
    statusType = "neutral";
  }

  // Position change indicator
  const getPositionChangeIcon = () => {
    if (positionChange > 0) {
      return <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    } else if (positionChange < 0) {
      return <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getPositionChangeText = () => {
    if (positionChange > 0) {
      return `+${positionChange} position${positionChange > 1 ? "s" : ""} this period`;
    } else if (positionChange < 0) {
      return `${positionChange} position${positionChange < -1 ? "s" : ""} this period`;
    }
    return "No change this period";
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-background">
      {/* Background gradients matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#C2C2E1]/20 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(194,194,225,0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(194,194,225,0.2),transparent_50%)]" />

      <div className="relative p-8 md:p-10">
          {/* Top Row: Brand Identity */}
          <div className="flex items-center gap-4 mb-8">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-border"
              style={{ backgroundColor: `${brand.color || "#3B82F6"}20` }}
            >
              <BrandLogo domain={brand.domain || brand.name} name={brand.name} size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{brand.name}</h2>
              <p className="text-muted-foreground text-sm">{brand.domain}</p>
            </div>
            {isLeader && (
              <Badge className="ml-auto bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-4 py-2">
                <Crown className="h-4 w-4 mr-2" />
                Market Leader
              </Badge>
            )}
          </div>

          {/* Main Rank Display */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-8">
            {/* Rank Number */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <span 
                  className="text-8xl md:text-9xl font-black"
                  style={{ 
                    color: brand.color || "#3B82F6",
                    textShadow: `0 0 60px ${brand.color || "#3B82F6"}40`,
                  }}
                >
                  #{brand.rank}
                </span>
              </div>

              {/* Position Change */}
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  {getPositionChangeIcon()}
                  <span className={cn(
                    "text-lg font-semibold",
                    positionChange > 0 && "text-emerald-600 dark:text-emerald-400",
                    positionChange < 0 && "text-rose-600 dark:text-rose-400",
                    positionChange === 0 && "text-muted-foreground"
                  )}>
                    {getPositionChangeText()}
                  </span>
                </div>
                <span className="text-muted-foreground text-sm">
                  Out of {data.competitors.length + 1} tracked brands
                </span>
              </div>
            </div>

            {/* Status Message */}
            <div className="flex-1 md:text-right">
              <p className={cn(
                "text-xl md:text-2xl font-medium",
                statusType === "success" && "text-emerald-600 dark:text-emerald-400",
                statusType === "warning" && "text-amber-600 dark:text-amber-400",
                statusType === "neutral" && "text-foreground"
              )}>
                {statusMessage}
              </p>
            </div>
          </div>

          {/* Progress Bar - Share of Mentions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/80 font-medium">Share of Mentions</span>
              <span className="text-foreground font-semibold">{brand.mentionsShare.toFixed(1)}%</span>
            </div>
            <div className="relative h-5 bg-muted/50 rounded-full overflow-hidden border border-border">
              <div 
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${brand.mentionsShare}%`,
                  backgroundColor: brand.color || "#C2C2E1",
                  boxShadow: `0 0 30px ${brand.color || "#C2C2E1"}50`,
                }}
              />
              {/* Competitor marker */}
              {closestCompetitor && !isLeader && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-7 bg-muted-foreground/40 rounded"
                  style={{ left: `${leader.mentionsShare}%` }}
                  title={`${leader.name}: ${leader.mentionsShare.toFixed(1)}%`}
                />
              )}
            </div>
            {!isLeader && closestCompetitor && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Your position</span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {leader.name}: {leader.mentionsShare.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Trend Indicator */}
          <div className="mt-6 flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border",
              brand.trend > 0 && "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
              brand.trend < 0 && "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30",
              brand.trend === 0 && "bg-muted/50 text-muted-foreground border-border"
            )}>
              {brand.trend > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : brand.trend < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              <span>
                {brand.trend > 0 ? "+" : ""}{brand.trend}% vs previous period
              </span>
            </div>
          </div>
        </div>
    </div>
  );
}
