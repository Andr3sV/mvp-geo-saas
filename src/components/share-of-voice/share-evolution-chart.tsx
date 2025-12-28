"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Layers, Info } from "lucide-react";
import { Tooltip as TooltipUI, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Memoize BrandLogo to avoid unnecessary re-renders
const MemoizedBrandLogo = React.memo(BrandLogo);
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Entity {
  id: string;
  name: string;
  domain: string;
  color?: string;
  isBrand: boolean;
}

interface ShareEvolutionChartProps {
  data: any[];
  entities: Entity[];
  isLoading?: boolean;
  infoTooltip?: string;
}

// Color palette for entities
const COLORS = [
  "#3b82f6", // blue (brand)
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
];

export const ShareEvolutionChart = React.memo(function ShareEvolutionChart({ 
  data, 
  entities, 
  isLoading, 
  infoTooltip 
}: ShareEvolutionChartProps) {

  // Helper function to get color for entity
  const getEntityColor = (entity: Entity, index: number): string => {
    if (entity.color) return entity.color;
    return COLORS[index % COLORS.length];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            Share Evolution Over Time
          </CardTitle>
          <CardDescription>How market share changes daily</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || entities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            Share Evolution Over Time
          </CardTitle>
          <CardDescription>How market share changes daily</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          <div className="space-y-1">
            {payload
              .sort((a: any, b: any) => b.value - a.value)
              .map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs">{entry.name}</span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums">
                    {entry.value.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              Share Evolution Over Time
              {infoTooltip && (
                <TooltipUI>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {infoTooltip}
                  </TooltipContent>
                </TooltipUI>
              )}
            </CardTitle>
            <CardDescription>How market share changes daily</CardDescription>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {entities.map((entity, index) => (
            <div key={entity.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getEntityColor(entity, index) }}
              />
              <MemoizedBrandLogo domain={entity.domain || entity.name} name={entity.name} size={14} />
              <span className="text-xs text-muted-foreground">{entity.name}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[300px] w-full" style={{ minHeight: 300, minWidth: 0 }}>
          {!isLoading && data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {entities.map((entity, index) => {
                  const entityColor = getEntityColor(entity, index);
                  return (
                    <linearGradient key={entity.id} id={`gradient-${entity.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={entityColor} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={entityColor} stopOpacity={0.3} />
                    </linearGradient>
                  );
                })}
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
                vertical={false}
              />

              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  // Ensure values are capped at 100 and formatted correctly
                  const cappedValue = Math.min(value, 100);
                  return `${cappedValue}%`;
                }}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
              />

              <Tooltip content={<CustomTooltip />} />

              {entities.map((entity, index) => (
                <Area
                  key={entity.id}
                  type="monotone"
                  dataKey={entity.id}
                  name={entity.name}
                  stackId="1"
                  stroke={getEntityColor(entity, index)}
                  fill={`url(#gradient-${entity.id})`}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              {isLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              ) : (
                <span>No data available</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
