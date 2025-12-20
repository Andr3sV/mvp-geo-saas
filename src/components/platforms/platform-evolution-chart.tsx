"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MessageSquare, Sparkles } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { PLATFORMS } from "@/lib/constants/platforms";

interface PlatformEvolutionChartProps {
  data: Array<{
    date: string;
    fullDate: string;
    openai: number;
    gemini: number;
    total: number;
  }>;
  isLoading?: boolean;
}

export function PlatformEvolutionChart({ data, isLoading }: PlatformEvolutionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Performance Evolution by Platform
          </CardTitle>
          <CardDescription>Daily mentions comparison: OpenAI vs Gemini</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Performance Evolution by Platform
          </CardTitle>
          <CardDescription>Daily mentions comparison: OpenAI vs Gemini</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold">{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          Performance Evolution by Platform
        </CardTitle>
        <CardDescription>Daily mentions comparison: OpenAI vs Gemini</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOpenai" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PLATFORMS.openai.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={PLATFORMS.openai.color} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorGemini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PLATFORMS.gemini.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={PLATFORMS.gemini.color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => (
                  <span className="text-sm font-medium">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="openai"
                name="OpenAI"
                stroke={PLATFORMS.openai.color}
                strokeWidth={2}
                fill="url(#colorOpenai)"
              />
              <Area
                type="monotone"
                dataKey="gemini"
                name="Gemini"
                stroke={PLATFORMS.gemini.color}
                strokeWidth={2}
                fill="url(#colorGemini)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
