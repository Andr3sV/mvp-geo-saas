"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface VelocityData {
  date: string;
  fullDate: string;
  queries: number;
}

interface QueryVelocityChartProps {
  data: VelocityData[];
  isLoading?: boolean;
}

export function QueryVelocityChart({ data, isLoading }: QueryVelocityChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Query Velocity
          </CardTitle>
          <CardDescription>Daily search query volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center">
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
            <Activity className="h-5 w-5 text-muted-foreground" />
            Query Velocity
          </CardTitle>
          <CardDescription>Daily search query volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Activity className="h-12 w-12 opacity-50" />
            <p>No velocity data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalQueries = data.reduce((sum, d) => sum + d.queries, 0);
  const avgDaily = Math.round(totalQueries / data.length);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl">
          <p className="font-medium text-sm mb-1">{label}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Queries: </span>
            <span className="font-semibold text-primary">{payload[0].value.toLocaleString()}</span>
          </p>
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
              <Activity className="h-5 w-5 text-muted-foreground" />
              Query Velocity
            </CardTitle>
            <CardDescription>Daily search query volume over time</CardDescription>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-xl font-semibold tabular-nums">{totalQueries.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total queries</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{avgDaily.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">avg/day</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
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
              <Area
                type="monotone"
                dataKey="queries"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#colorQueries)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
