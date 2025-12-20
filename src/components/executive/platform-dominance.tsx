"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Grid3X3, Crown, Trophy, Sparkles, Bot, Search, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformDominanceData } from "@/lib/queries/executive-overview";

interface PlatformDominanceProps {
  data: PlatformDominanceData;
  isLoading?: boolean;
}

// Platform icons
const platformIcons: Record<string, React.ReactNode> = {
  openai: <Sparkles className="h-4 w-4" />,
  gemini: <Bot className="h-4 w-4" />,
  perplexity: <Search className="h-4 w-4" />,
  claude: <MessageCircle className="h-4 w-4" />,
};

export function PlatformDominance({ data, isLoading }: PlatformDominanceProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            Platform Dominance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const brand = data.entities.find(e => e.isBrand);
  const competitors = data.entities.filter(e => !e.isBrand).slice(0, 5); // Top 5 competitors
  const allDisplayedEntities = brand ? [brand, ...competitors] : competitors;

  const getRankBadge = (rank: number, isBrand: boolean) => {
    if (rank === 1) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2">
          <Crown className="h-3 w-3 mr-1" />
          #1
        </Badge>
      );
    }
    if (rank === 2) {
      return (
        <Badge variant="secondary" className="font-semibold">
          #2
        </Badge>
      );
    }
    if (rank === 3) {
      return (
        <Badge variant="outline" className="font-semibold">
          #3
        </Badge>
      );
    }
    return (
      <span className="text-sm text-muted-foreground font-medium">
        #{rank}
      </span>
    );
  };

  const getRankCellStyle = (rank: number, isBrand: boolean) => {
    if (rank === 1) {
      return "bg-amber-50 dark:bg-amber-950/30";
    }
    if (rank === 2) {
      return "bg-slate-50 dark:bg-slate-900/30";
    }
    if (rank === 3) {
      return "bg-orange-50/50 dark:bg-orange-950/20";
    }
    return "";
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-muted-foreground" />
              Platform Dominance
            </CardTitle>
            <CardDescription className="mt-1">
              Your ranking across each AI platform
            </CardDescription>
          </div>
          <Badge 
            variant={data.brandLeadsCount > 0 ? "default" : "secondary"}
            className={cn(
              data.brandLeadsCount >= 3 && "bg-emerald-500 hover:bg-emerald-600",
              data.brandLeadsCount >= 2 && data.brandLeadsCount < 3 && "bg-amber-500 hover:bg-amber-600"
            )}
          >
            <Trophy className="h-3 w-3 mr-1" />
            Leading on {data.brandLeadsCount} platform{data.brandLeadsCount !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Heatmap Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-48">
                  Brand
                </th>
                {data.platforms.map((platform) => (
                  <th 
                    key={platform.id} 
                    className="text-center py-3 px-4 text-sm font-medium text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      {platformIcons[platform.id]}
                      <span>{platform.name}</span>
                    </div>
                  </th>
                ))}
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground w-28">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allDisplayedEntities.map((entity, entityIndex) => (
                <tr 
                  key={entity.id}
                  className={cn(
                    "transition-colors",
                    entity.isBrand 
                      ? "bg-primary/5 hover:bg-primary/10" 
                      : "hover:bg-muted/30"
                  )}
                >
                  {/* Entity Name */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${entity.color || "#64748b"}20` }}
                      >
                        <BrandLogo 
                          domain={entity.name} 
                          name={entity.name} 
                          size={20}
                        />
                      </div>
                      <div>
                        <span className={cn(
                          "font-medium",
                          entity.isBrand && "text-primary"
                        )}>
                          {entity.name}
                        </span>
                        {entity.isBrand && (
                          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                            You
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Platform Ranks */}
                  {data.platforms.map((platform) => {
                    const rank = entity.platformRanks[platform.id] || 99;
                    return (
                      <td 
                        key={platform.id}
                        className={cn(
                          "text-center py-3 px-4 transition-colors",
                          getRankCellStyle(rank, entity.isBrand)
                        )}
                      >
                        {getRankBadge(rank, entity.isBrand)}
                      </td>
                    );
                  })}

                  {/* Total Mentions */}
                  <td className="text-right py-3 px-4">
                    <span className="text-sm font-medium tabular-nums">
                      {entity.totalMentions.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900" />
              <span>#1 Leader</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800" />
              <span>#2 Runner-up</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900" />
              <span>#3 Podium</span>
            </div>
          </div>
          
          {brand && (
            <div className="text-sm">
              <span className="text-muted-foreground">Your best platform: </span>
              <span className="font-semibold">
                {(() => {
                  const bestPlatform = Object.entries(brand.platformRanks)
                    .sort(([, a], [, b]) => a - b)[0];
                  const platformInfo = data.platforms.find(p => p.id === bestPlatform[0]);
                  return `${platformInfo?.name || bestPlatform[0]} (#${bestPlatform[1]})`;
                })()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
