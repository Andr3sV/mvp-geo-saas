"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Check, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
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
}

interface EvolutionChartProps {
  // Chart configuration
  title: string;
  description: string;
  icon?: LucideIcon;
  
  // Data
  data: any[];
  primaryDataKey: string; // e.g., "brandMentions", "brandCitations"
  secondaryDataKey: string; // e.g., "competitorMentions", "competitorCitations"
  dataLabel: string; // e.g., "mention", "citation"
  dateKey?: string; // defaults to "date"
  
  // Primary entity (brand)
  primaryEntityName: string;
  primaryEntityDomain: string;
  
  // Secondary entity (selected competitor)
  secondaryEntityName: string;
  secondaryEntityDomain: string;
  
  // Selection
  entities: Entity[]; // List of competitors/entities to compare with
  selectedEntityId: string | null;
  onEntityChange: (entityId: string) => void;
  
  // States
  isLoading: boolean;
  
  // Styling (optional)
  primaryColor?: string; // defaults to blue
  secondaryColor?: string; // defaults to red
  emptyStateMessage?: string;
}

export function EvolutionChart({
  title,
  description,
  icon: Icon,
  data,
  primaryDataKey,
  secondaryDataKey,
  dataLabel,
  dateKey = "date",
  primaryEntityName,
  primaryEntityDomain,
  secondaryEntityName,
  secondaryEntityDomain,
  entities,
  selectedEntityId,
  onEntityChange,
  isLoading,
  primaryColor = "rgb(59, 130, 246)", // blue-500
  secondaryColor = "rgb(239, 68, 68)", // red-500
  emptyStateMessage = "Run analyses with different prompts to see trends",
}: EvolutionChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {payload[0].payload[dateKey]}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-foreground">{entry.name}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {entry.value} {entry.value === 1 ? dataLabel : `${dataLabel}s`}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const primaryTotal = data.reduce((sum, item) => sum + (item[primaryDataKey] || 0), 0);
  const secondaryTotal = data.reduce((sum, item) => sum + (item[secondaryDataKey] || 0), 0);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-xl">
              {Icon && <Icon className="h-5 w-5 text-primary" />}
              {title}
            </CardTitle>
            <CardDescription className="text-sm">
              {description}
            </CardDescription>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onEntityChange("")}
              disabled={isLoading}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                "border hover:border-primary/50",
                !selectedEntityId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              )}
            >
              <BrandLogo domain={primaryEntityDomain} name={primaryEntityName} size={16} />
              <span>{primaryEntityName}</span>
              {!selectedEntityId && <Check className="h-3 w-3" />}
            </button>

            {entities.map((entity) => (
              <button
                key={entity.id}
                onClick={() => onEntityChange(entity.id)}
                disabled={isLoading}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  "border hover:border-primary/50",
                  selectedEntityId === entity.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                )}
              >
                <BrandLogo domain={entity.domain} name={entity.name} size={16} />
                <span>{entity.name}</span>
                {selectedEntityId === entity.id && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>

          {entities.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Add competitors in Competitor Management to compare
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />
            <span className="text-sm font-medium">{primaryEntityName}</span>
            <span className="text-xs text-muted-foreground">
              ({primaryTotal} total)
            </span>
          </div>
          {selectedEntityId && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: secondaryColor }} />
              <span className="text-sm font-medium">{secondaryEntityName}</span>
              <span className="text-xs text-muted-foreground">
                ({secondaryTotal} total)
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-[320px] flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl">📊</div>
              <p className="font-medium">No data available yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                {emptyStateMessage}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[320px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                  vertical={false}
                />

                <XAxis
                  dataKey={dateKey}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />

                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  allowDecimals={false}
                />

                <Tooltip content={<CustomTooltip />} cursor={false} />

                <Line
                  type="monotone"
                  dataKey={primaryDataKey}
                  name={primaryEntityName}
                  stroke={primaryColor}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: primaryColor,
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />

                {selectedEntityId && (
                  <Line
                    type="monotone"
                    dataKey={secondaryDataKey}
                    name={secondaryEntityName}
                    stroke={secondaryColor}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: secondaryColor,
                      strokeWidth: 2,
                      stroke: "#fff",
                    }}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

