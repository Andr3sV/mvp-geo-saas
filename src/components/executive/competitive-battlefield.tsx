"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Swords, TrendingUp, TrendingDown, Minus, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompetitiveBattlefieldData, CompetitorBattleData } from "@/lib/queries/executive-overview";

interface CompetitiveBattlefieldProps {
  data: CompetitiveBattlefieldData;
  isLoading?: boolean;
}

export function CompetitiveBattlefield({ data, isLoading }: CompetitiveBattlefieldProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-muted-foreground" />
            Competitive Battlefield
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-6 bg-muted rounded-full" />
                </div>
                <div className="w-16 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine brand and competitors, sort by share
  const allEntities = [data.brand, ...data.competitors].sort((a, b) => b.mentionsShare - a.mentionsShare);
  const maxShare = Math.max(...allEntities.map(e => e.mentionsShare));

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-rose-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-emerald-600";
    if (trend < 0) return "text-rose-600";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-muted-foreground" />
              Competitive Battlefield
            </CardTitle>
            <CardDescription className="mt-1">
              Share of Mentions ranking - Who&apos;s winning the AI conversation?
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.totalMentions.toLocaleString()} total mentions
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allEntities.map((entity, index) => {
            const barWidth = maxShare > 0 ? (entity.mentionsShare / maxShare) * 100 : 0;
            const isLeader = index === 0;

            return (
              <div 
                key={entity.id}
                className={cn(
                  "group relative rounded-xl p-4 transition-all duration-200",
                  entity.isBrand 
                    ? "bg-primary/5 border-2 border-primary/20 hover:border-primary/40" 
                    : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    isLeader 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isLeader ? (
                      <Crown className="h-4 w-4" />
                    ) : (
                      `#${entity.rank}`
                    )}
                  </div>

                  {/* Logo & Name */}
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${entity.color || "#64748b"}20` }}
                    >
                      <BrandLogo 
                        domain={entity.domain || entity.name} 
                        name={entity.name} 
                        size={24}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-semibold",
                          entity.isBrand && "text-primary"
                        )}>
                          {entity.name}
                        </span>
                        {entity.isBrand && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            You
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {entity.mentions.toLocaleString()} mentions
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1">
                    <div className="h-8 bg-muted/50 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3"
                        style={{ 
                          width: `${barWidth}%`,
                          backgroundColor: entity.color || "#64748b",
                        }}
                      >
                        <span className="text-sm font-bold text-white drop-shadow-sm">
                          {entity.mentionsShare.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="flex items-center gap-1 min-w-[80px] justify-end">
                    {getTrendIcon(entity.trend)}
                    <span className={cn(
                      "text-sm font-medium tabular-nums",
                      getTrendColor(entity.trend)
                    )}>
                      {entity.trend > 0 ? "+" : ""}{entity.trend}%
                    </span>
                  </div>
                </div>

                {/* Gap indicator for non-leaders */}
                {!isLeader && entity.isBrand && (
                  <div className="mt-3 pt-3 border-t border-dashed border-primary/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Gap to leader ({data.leader.name})
                      </span>
                      <span className="font-semibold text-amber-600">
                        -{data.gapToLeader.toFixed(1)} points
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-6 text-muted-foreground">
            <span>
              <strong className="text-foreground">{allEntities.length}</strong> brands tracked
            </span>
            <span>
              <strong className="text-foreground">{data.totalMentions.toLocaleString()}</strong> total mentions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Your position:</span>
            <Badge 
              variant={data.brand.rank === 1 ? "default" : "secondary"}
              className={cn(
                data.brand.rank === 1 && "bg-amber-500 hover:bg-amber-600"
              )}
            >
              #{data.brand.rank}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
