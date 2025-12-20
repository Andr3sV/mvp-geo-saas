"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords } from "lucide-react";
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

interface DailyPlatformBattleProps {
  data: Array<{
    date: string;
    fullDate: string;
    openai: number;
    gemini: number;
    total: number;
  }>;
  isLoading?: boolean;
}

export function DailyPlatformBattle({ data, isLoading }: DailyPlatformBattleProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Swords className="h-5 w-5 text-muted-foreground" />
            Daily Platform Battle
          </CardTitle>
          <CardDescription>Daily share distribution between platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
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
            <Swords className="h-5 w-5 text-muted-foreground" />
            Daily Platform Battle
          </CardTitle>
          <CardDescription>Daily share distribution between platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data to percentages
  const percentageData = data.map((d) => ({
    date: d.date,
    fullDate: d.fullDate,
    openai: d.total > 0 ? Number(((d.openai / d.total) * 100).toFixed(1)) : 50,
    gemini: d.total > 0 ? Number(((d.gemini / d.total) * 100).toFixed(1)) : 50,
    openaiMentions: d.openai,
    geminiMentions: d.gemini,
    total: d.total,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORMS.openai.color }} />
                <span>OpenAI</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">{data.openai}%</span>
                <span className="text-muted-foreground ml-1">({data.openaiMentions})</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORMS.gemini.color }} />
                <span>Gemini</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">{data.gemini}%</span>
                <span className="text-muted-foreground ml-1">({data.geminiMentions})</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Swords className="h-5 w-5 text-muted-foreground" />
          Daily Platform Battle
        </CardTitle>
        <CardDescription>Daily share distribution between platforms (stacked 100%)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={percentageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} stackOffset="expand">
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
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
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
                stackId="1"
                stroke={PLATFORMS.openai.color}
                fill={PLATFORMS.openai.color}
                fillOpacity={0.8}
              />
              <Area
                type="monotone"
                dataKey="gemini"
                name="Gemini"
                stackId="1"
                stroke={PLATFORMS.gemini.color}
                fill={PLATFORMS.gemini.color}
                fillOpacity={0.8}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
