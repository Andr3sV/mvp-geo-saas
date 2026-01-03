"use client";

import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TrendingUp, TrendingDown, Minus, Crown, Target, MessageSquare, Circle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { CompetitiveBattlefieldData } from "@/lib/queries/executive-overview";

interface CompetitiveHeroProps {
  data: CompetitiveBattlefieldData | null;
  isLoading?: boolean;
  sentimentData?: {
    sentimentLabel: 'positive' | 'neutral' | 'negative';
    totalMentions: number;
  };
  competitorSentiments?: Record<string, 'positive' | 'neutral' | 'negative'>;
  category?: string;
}

export function CompetitiveHero({ data, isLoading, sentimentData, competitorSentiments = {}, category }: CompetitiveHeroProps) {
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

  // Format mentions count
  const formatMentions = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Extract clean domain (without https://)
  const getCleanDomain = (url: string) => {
    if (!url) return "";
    return url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
  };

  // Get competitors to show
  // If brand is #1, show next 2 competitors
  // If brand is not #1, show the one above and the one below
  let nextCompetitors: typeof data.competitors = [];
  if (isLeader) {
    // Show next 2 competitors
    nextCompetitors = data.competitors.slice(0, 2);
  } else {
    // Find competitors above and below
    const allEntities = [data.brand, ...data.competitors].sort((a, b) => a.rank - b.rank);
    const brandIndex = allEntities.findIndex(e => e.id === data.brand.id);
    
    if (brandIndex > 0) {
      // Add competitor above (filter out if it's the brand itself)
      const entityAbove = allEntities[brandIndex - 1];
      if (entityAbove && !entityAbove.isBrand) {
        nextCompetitors.push(entityAbove);
      }
    }
    if (brandIndex < allEntities.length - 1) {
      // Add competitor below (filter out if it's the brand itself)
      const entityBelow = allEntities[brandIndex + 1];
      if (entityBelow && !entityBelow.isBrand) {
        nextCompetitors.push(entityBelow);
      }
    }
  }

  // Use real sentiment data if available, otherwise fallback
  const sentimentLabel = sentimentData?.sentimentLabel || (brand.trend > 0 ? "positive" : brand.trend < -2 ? "negative" : "neutral");
  const sentimentColor = sentimentLabel === "positive" ? "text-emerald-600" : sentimentLabel === "negative" ? "text-rose-600" : "text-amber-600";
  // Use brand.mentions (actual mentions count) instead of sentimentData.totalMentions
  const totalMentions = brand.mentions;

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden bg-background border border-border shadow-lg">
        <div className="relative p-6 md:p-8 pb-0">
          {/* Top Row: Brand Identity and Category Rank */}
          <div className="flex items-start justify-between mb-6">
            {/* Left: Brand Identity */}
            <div className="flex items-start gap-4 flex-1">
              <div className="relative">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center border-2 border-border p-1"
                  style={{ backgroundColor: `${brand.color || "#3B82F6"}15` }}
                >
                  <BrandLogo domain={brand.domain || brand.name} name={brand.name} size={56} />
                </div>
                {isLeader && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-foreground">{brand.name}</h2>
                  {isLeader && (
                    <Badge className="bg-amber-500 text-amber-950 border-0 px-3 py-1 font-semibold">
                      <Crown className="h-3.5 w-3.5 mr-1.5" />
                      LEADER
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {category && (
                    <>
                      <span>{category}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>{getCleanDomain(brand.domain || "")}</span>
                </div>
              </div>
            </div>

            {/* Right: Category Rank */}
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">CATEGORY RANK</p>
              <div 
                className="text-7xl md:text-8xl font-black leading-none"
                style={{ 
                  color: brand.color || "#3B82F6",
                }}
              >
                #{brand.rank}
              </div>
            </div>
          </div>

        {/* Main Content Area - Horizontal Bar */}
        <div className="bg-muted/30 border-t border-b border-border -mx-6 md:-mx-8 px-6 md:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Left: Share of Voice */}
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-3xl font-bold text-foreground">
                  {brand.mentionsShare.toFixed(1)}% <span className="text-lg">SHARE</span>
                </span>
                {brand.trend !== 0 && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium",
                    brand.trend > 0 && "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
                    brand.trend < 0 && "bg-rose-500/20 text-rose-700 dark:text-rose-400"
                  )}>
                    {brand.trend > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    <span>{brand.trend > 0 ? "+" : ""}{brand.trend.toFixed(1)}%</span>
                  </div>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-2">
                <div 
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${brand.mentionsShare}%`,
                    backgroundColor: brand.color || "#C2C2E1",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-1 text-[10px]">
                  <span 
                    className="font-medium"
                    style={{ 
                      color: brand.color || "#3B82F6",
                    }}
                  >
                    0%
                  </span>
                  <span className="text-muted-foreground font-medium">100%</span>
                </div>
              </div>
              
              {!isLeader && closestCompetitor && (
                <p className="text-xs text-muted-foreground">
                  Nearest competitor: {leader.name} ({leader.mentionsShare.toFixed(1)}%)
                </p>
              )}
            </div>
          </div>
        </div>

          {/* Bottom Row: Sentiment and Mentions - Inside main box with darker background, no margins, attached to bottom */}
          <div className="bg-muted/50 -mx-6 md:-mx-8 -mb-6 md:-mb-8 py-4 border-t border-border">
            <div className="flex items-center justify-between px-6 md:px-8">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Circle className={cn("h-3 w-3 fill-current", sentimentColor)} />
                  <span className="text-sm font-medium text-foreground capitalize">{sentimentLabel} Sentiment</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{formatMentions(totalMentions)} Mentions</span>
                </div>
              </div>
              <Link href="/dashboard/share-of-voice" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Full Report →
              </Link>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
