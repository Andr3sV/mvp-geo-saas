"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TrendingUp } from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  domain: string;
}

interface MentionsEvolutionChartProps {
  data: any[];
  brandName: string;
  competitorName: string;
  competitors: Competitor[];
  selectedCompetitorId: string | null;
  onCompetitorChange: (competitorId: string) => void;
  isLoading: boolean;
}

export function MentionsEvolutionChart({
  data,
  brandName,
  competitorName,
  competitors,
  selectedCompetitorId,
  onCompetitorChange,
  isLoading,
}: MentionsEvolutionChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-semibold">{entry.value}</span> mentions
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Mentions Over Time
            </CardTitle>
            <CardDescription>
              Track daily mention trends for your brand vs competitors
            </CardDescription>
          </div>

          <div className="w-[280px]">
            <Select
              value={selectedCompetitorId || "none"}
              onValueChange={(value) => onCompetitorChange(value === "none" ? "" : value)}
              disabled={isLoading || competitors.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Compare with..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <span>📊 Brand only</span>
                  </div>
                </SelectItem>
                {competitors.map((comp) => (
                  <SelectItem key={comp.id} value={comp.id}>
                    <div className="flex items-center gap-2">
                      <BrandLogo domain={comp.domain} name={comp.name} size={16} />
                      <span>{comp.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {competitors.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Add competitors to compare
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-2 text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>No data available yet</p>
              <p className="text-sm mt-1">Run analyses to see mention trends</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "currentColor" }}
                  label={{ value: "Mentions", angle: -90, position: "insideLeft" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="brandMentions"
                  name={brandName}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                {selectedCompetitorId && (
                  <Line
                    type="monotone"
                    dataKey="competitorMentions"
                    name={competitorName}
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--destructive))", r: 4 }}
                    activeDot={{ r: 6 }}
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

