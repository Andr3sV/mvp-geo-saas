"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TrendingUp, Check } from "lucide-react";
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

interface Competitor {
  id: string;
  name: string;
  domain: string;
}

interface MentionsEvolutionChartProps {
  data: any[];
  brandName: string;
  brandDomain: string;
  competitorName: string;
  competitorDomain: string;
  competitors: Competitor[];
  selectedCompetitorId: string | null;
  onCompetitorChange: (competitorId: string) => void;
  isLoading: boolean;
}

export function MentionsEvolutionChart({
  data,
  brandName,
  brandDomain,
  competitorName,
  competitorDomain,
  competitors,
  selectedCompetitorId,
  onCompetitorChange,
  isLoading,
}: MentionsEvolutionChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {payload[0].payload.date}
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
                  {entry.value} {entry.value === 1 ? "mention" : "mentions"}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const brandTotal = data.reduce((sum, item) => sum + item.brandMentions, 0);
  const competitorTotal = data.reduce((sum, item) => sum + item.competitorMentions, 0);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="h-5 w-5 text-primary" />
              Mentions Evolution
            </CardTitle>
            <CardDescription className="text-sm">
              Track daily mention trends over the last 30 days
            </CardDescription>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Compare with</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onCompetitorChange("")}
              disabled={isLoading}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                "border hover:border-primary/50",
                !selectedCompetitorId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              )}
            >
              <BrandLogo domain={brandDomain} name={brandName} size={16} />
              <span>{brandName}</span>
              {!selectedCompetitorId && <Check className="h-3 w-3" />}
            </button>

            {competitors.map((comp) => (
              <button
                key={comp.id}
                onClick={() => onCompetitorChange(comp.id)}
                disabled={isLoading}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  "border hover:border-primary/50",
                  selectedCompetitorId === comp.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                )}
              >
                <BrandLogo domain={comp.domain} name={comp.name} size={16} />
                <span>{comp.name}</span>
                {selectedCompetitorId === comp.id && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>

          {competitors.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Add competitors in Competitor Management to compare
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-medium">{brandName}</span>
            <span className="text-xs text-muted-foreground">
              ({brandTotal} total)
            </span>
          </div>
          {selectedCompetitorId && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium">{competitorName}</span>
              <span className="text-xs text-muted-foreground">
                ({competitorTotal} total)
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
                Run analyses with different prompts to see mention trends
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
                  dataKey="date"
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
                  dataKey="brandMentions"
                  name={brandName}
                  stroke="rgb(59, 130, 246)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "rgb(59, 130, 246)",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />

                {selectedCompetitorId && (
                  <Line
                    type="monotone"
                    dataKey="competitorMentions"
                    name={competitorName}
                    stroke="rgb(239, 68, 68)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "rgb(239, 68, 68)",
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
