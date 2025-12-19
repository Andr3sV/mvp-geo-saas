"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Target, TrendingUp, TrendingDown, Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Entity {
  id: string;
  name: string;
  domain: string;
  percentage: number;
  trend: number;
  mentions: number;
  isBrand: boolean;
}

interface MomentumMatrixProps {
  entities: Entity[];
  isLoading?: boolean;
}

// Quadrant classification
function getQuadrant(share: number, trend: number, avgShare: number): {
  quadrant: "leader-growing" | "leader-declining" | "challenger-rising" | "losing-ground";
  label: string;
  color: string;
  bgColor: string;
  icon: typeof TrendingUp;
} {
  const isLeader = share >= avgShare;
  const isGrowing = trend >= 0;

  if (isLeader && isGrowing) {
    return {
      quadrant: "leader-growing",
      label: "Leader Growing",
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      icon: Crown,
    };
  } else if (isLeader && !isGrowing) {
    return {
      quadrant: "leader-declining",
      label: "Leader at Risk",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      icon: AlertTriangle,
    };
  } else if (!isLeader && isGrowing) {
    return {
      quadrant: "challenger-rising",
      label: "Rising Challenger",
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      icon: TrendingUp,
    };
  } else {
    return {
      quadrant: "losing-ground",
      label: "Losing Ground",
      color: "text-rose-600",
      bgColor: "bg-rose-500/10",
      icon: TrendingDown,
    };
  }
}

export function MomentumMatrix({ entities, isLoading }: MomentumMatrixProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            Competitive Momentum Matrix
          </CardTitle>
          <CardDescription>Strategic positioning analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entities || entities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            Competitive Momentum Matrix
          </CardTitle>
          <CardDescription>Strategic positioning analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate metrics
  const maxShare = Math.max(...entities.map(e => e.percentage));
  const avgShare = entities.reduce((sum, e) => sum + e.percentage, 0) / entities.length;
  const maxMentions = Math.max(...entities.map(e => e.mentions));

  // Classify entities by quadrant
  const classifiedEntities = entities.map(entity => ({
    ...entity,
    ...getQuadrant(entity.percentage, entity.trend, avgShare),
  }));

  // Sort by mentions for display
  const sortedEntities = [...classifiedEntities].sort((a, b) => b.mentions - a.mentions);

  // Find brand entity
  const brandEntity = sortedEntities.find(e => e.isBrand);

  // Group by quadrant for summary
  const quadrantCounts = {
    "leader-growing": classifiedEntities.filter(e => e.quadrant === "leader-growing").length,
    "leader-declining": classifiedEntities.filter(e => e.quadrant === "leader-declining").length,
    "challenger-rising": classifiedEntities.filter(e => e.quadrant === "challenger-rising").length,
    "losing-ground": classifiedEntities.filter(e => e.quadrant === "losing-ground").length,
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Competitive Momentum Matrix
            </CardTitle>
            <CardDescription className="mt-1">
              Analyze market position (share) vs momentum (growth trend)
            </CardDescription>
          </div>
          {brandEntity && (
            <div className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              brandEntity.bgColor,
              brandEntity.color
            )}>
              Your position: {brandEntity.label}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Visual Matrix Grid */}
        <div className="space-y-2">
          {/* 2x2 Matrix */}
          <div className="grid grid-cols-2 gap-1">
            {/* Top Left - Rising Challengers */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-tl-xl p-4 min-h-[160px]">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[11px] font-semibold text-blue-600">Rising Challengers</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  ({quadrantCounts["challenger-rising"]})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedEntities
                  .filter(e => e.quadrant === "challenger-rising")
                  .map(entity => (
                    <EntityBubble 
                      key={entity.id} 
                      entity={entity} 
                      maxMentions={maxMentions}
                      maxShare={maxShare}
                    />
                  ))}
              </div>
            </div>

            {/* Top Right - Leaders Growing */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-tr-xl p-4 min-h-[160px]">
              <div className="flex items-center gap-1.5 mb-3">
                <Crown className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[11px] font-semibold text-emerald-600">Leaders Growing</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  ({quadrantCounts["leader-growing"]})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedEntities
                  .filter(e => e.quadrant === "leader-growing")
                  .map(entity => (
                    <EntityBubble 
                      key={entity.id} 
                      entity={entity} 
                      maxMentions={maxMentions}
                      maxShare={maxShare}
                    />
                  ))}
              </div>
            </div>

            {/* Bottom Left - Losing Ground */}
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-bl-xl p-4 min-h-[160px]">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                <span className="text-[11px] font-semibold text-rose-600">Losing Ground</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  ({quadrantCounts["losing-ground"]})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedEntities
                  .filter(e => e.quadrant === "losing-ground")
                  .map(entity => (
                    <EntityBubble 
                      key={entity.id} 
                      entity={entity} 
                      maxMentions={maxMentions}
                      maxShare={maxShare}
                    />
                  ))}
              </div>
            </div>

            {/* Bottom Right - Leaders at Risk */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-br-xl p-4 min-h-[160px]">
              <div className="flex items-center gap-1.5 mb-3">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[11px] font-semibold text-amber-600">Leaders at Risk</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  ({quadrantCounts["leader-declining"]})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedEntities
                  .filter(e => e.quadrant === "leader-declining")
                  .map(entity => (
                    <EntityBubble 
                      key={entity.id} 
                      entity={entity} 
                      maxMentions={maxMentions}
                      maxShare={maxShare}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* Axis Labels - Bottom */}
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-rose-500" />
              <span>Lower Growth</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              ← Lower Share | Higher Share →
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>Higher Growth</span>
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Detailed Rankings Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/30 px-4 py-2 border-b">
            <span className="text-xs font-medium text-muted-foreground">Detailed Breakdown (by mention volume)</span>
          </div>
          <div className="divide-y max-h-[240px] overflow-y-auto">
            {sortedEntities.slice(0, 10).map((entity, index) => {
              const Icon = entity.icon;
              return (
                <div
                  key={entity.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors",
                    entity.isBrand && "bg-primary/5"
                  )}
                >
                  <span className="text-xs text-muted-foreground w-5 tabular-nums">
                    {index + 1}
                  </span>
                  <BrandLogo domain={entity.domain || entity.name} name={entity.name} size={20} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{entity.name}</span>
                      {entity.isBrand && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-primary/10 text-primary">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right w-16">
                      <div className="font-semibold tabular-nums">{entity.percentage.toFixed(1)}%</div>
                      <div className="text-muted-foreground text-[10px]">share</div>
                    </div>
                    <div className={cn("text-right w-16", entity.color)}>
                      <div className="font-semibold tabular-nums flex items-center justify-end gap-1">
                        {entity.trend > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : entity.trend < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : null}
                        {entity.trend > 0 ? "+" : ""}{entity.trend.toFixed(1)}%
                      </div>
                      <div className="text-muted-foreground text-[10px]">trend</div>
                    </div>
                    <div className="text-right w-20">
                      <div className="font-semibold tabular-nums">{entity.mentions.toLocaleString()}</div>
                      <div className="text-muted-foreground text-[10px]">mentions</div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-[10px] font-medium w-28 text-center",
                      entity.bgColor,
                      entity.color
                    )}>
                      <Icon className="h-3 w-3 inline mr-1" />
                      {entity.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
          <span>Threshold: {avgShare.toFixed(1)}% market share (average)</span>
          <span>Total: {entities.length} brands analyzed</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Entity bubble component for quadrants
function EntityBubble({ 
  entity, 
  maxMentions,
  maxShare,
}: { 
  entity: Entity & { label: string; color: string; bgColor: string };
  maxMentions: number;
  maxShare: number;
}) {
  // Size based on mentions (normalized)
  const sizeRatio = Math.sqrt(entity.mentions / maxMentions);
  const size = Math.max(32, Math.min(56, 32 + sizeRatio * 24));

  return (
    <div 
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg p-1.5 transition-all hover:scale-105 cursor-default group",
        entity.bgColor,
        entity.isBrand && "ring-2 ring-primary ring-offset-1"
      )}
      style={{ width: size, height: size }}
      title={`${entity.name}: ${entity.percentage.toFixed(1)}% share, ${entity.trend > 0 ? "+" : ""}${entity.trend.toFixed(1)}% trend, ${entity.mentions.toLocaleString()} mentions`}
    >
      <BrandLogo 
        domain={entity.domain || entity.name} 
        name={entity.name} 
        size={size > 40 ? 20 : 16} 
      />
      {entity.isBrand && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
          <span className="text-[7px] text-primary-foreground font-bold">★</span>
        </div>
      )}
      
      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-popover border rounded-lg shadow-lg p-2 whitespace-nowrap text-xs">
          <div className="font-medium">{entity.name}</div>
          <div className="text-muted-foreground mt-1 space-y-0.5">
            <div>Share: <span className="font-semibold text-foreground">{entity.percentage.toFixed(1)}%</span></div>
            <div>Trend: <span className={cn("font-semibold", entity.color)}>{entity.trend > 0 ? "+" : ""}{entity.trend.toFixed(1)}%</span></div>
            <div>Mentions: <span className="font-semibold text-foreground">{entity.mentions.toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
