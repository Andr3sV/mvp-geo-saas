"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Grid3X3, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Platform {
  id: string;
  label: string;
}

interface EntityData {
  id: string;
  name: string;
  domain: string;
  isBrand: boolean;
  total: number;
  [key: string]: any; // platform mentions
}

interface PlatformHeatmapProps {
  data: EntityData[];
  platforms: Platform[];
  isLoading?: boolean;
}

export function PlatformHeatmap({ data, platforms, isLoading }: PlatformHeatmapProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            Platform Performance
          </CardTitle>
          <CardDescription>Mentions breakdown by AI platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || !platforms || platforms.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            Platform Performance
          </CardTitle>
          <CardDescription>Mentions breakdown by AI platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find max value for color intensity
  const allValues = data.flatMap((entity) => 
    platforms.map((p) => entity[p.id] || 0)
  );
  const maxValue = Math.max(...allValues, 1);

  // Find leader for each platform
  const platformLeaders = platforms.reduce((acc, platform) => {
    const leader = data.reduce((max, entity) => 
      (entity[platform.id] || 0) > (max[platform.id] || 0) ? entity : max
    );
    acc[platform.id] = leader.id;
    return acc;
  }, {} as Record<string, string>);

  // Get intensity color
  const getIntensity = (value: number) => {
    const ratio = value / maxValue;
    if (ratio === 0) return "bg-muted/30";
    if (ratio < 0.25) return "bg-primary/20";
    if (ratio < 0.5) return "bg-primary/40";
    if (ratio < 0.75) return "bg-primary/60";
    return "bg-primary/80";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-muted-foreground" />
          Platform Performance
        </CardTitle>
        <CardDescription>Mentions breakdown by AI platform</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                  Brand
                </th>
                {platforms.map((platform) => (
                  <th key={platform.id} className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">
                    {platform.label}
                  </th>
                ))}
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((entity, rowIndex) => (
                <tr 
                  key={entity.id}
                  className={cn(
                    "border-t border-border/50",
                    entity.isBrand && "bg-primary/5"
                  )}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <BrandLogo domain={entity.domain || entity.name} name={entity.name} size={18} />
                      <span className={cn(
                        "text-sm",
                        entity.isBrand && "font-medium text-primary"
                      )}>
                        {entity.name}
                      </span>
                      {entity.isBrand && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-primary/10 text-primary">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  {platforms.map((platform) => {
                    const value = entity[platform.id] || 0;
                    const isLeader = platformLeaders[platform.id] === entity.id && value > 0;

                    return (
                      <td key={platform.id} className="py-2 px-1 text-center">
                        <div className="relative">
                          <div className={cn(
                            "mx-auto w-14 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors",
                            getIntensity(value),
                            value > 0 && "text-foreground"
                          )}>
                            {value > 0 ? value.toLocaleString() : "-"}
                          </div>
                          {isLeader && (
                            <Crown className="absolute -top-1 -right-1 h-3 w-3 text-amber-500" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right">
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      entity.isBrand && "text-primary"
                    )}>
                      {entity.total.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Color scale legend */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="text-[10px] text-muted-foreground">Low</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-3 rounded-sm bg-primary/20" />
            <div className="w-4 h-3 rounded-sm bg-primary/40" />
            <div className="w-4 h-3 rounded-sm bg-primary/60" />
            <div className="w-4 h-3 rounded-sm bg-primary/80" />
          </div>
          <span className="text-[10px] text-muted-foreground">High</span>
        </div>
      </CardContent>
    </Card>
  );
}
