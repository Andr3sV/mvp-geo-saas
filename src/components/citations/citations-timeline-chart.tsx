"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TimelineData {
  date: string;
  gained: number;
  lost: number;
  netChange: number;
  total: number;
}

interface CitationsTimelineChartProps {
  data: TimelineData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <p className="text-green-600">
            Gained: {payload[0]?.value || 0}
          </p>
          <p className="text-red-600">
            Lost: {Math.abs(Number(payload[1]?.value) || 0)}
          </p>
          <p className="font-medium">
            Net Change: {payload[0]?.payload?.netChange || 0}
          </p>
          <p className="text-muted-foreground">
            Total: {payload[0]?.payload?.total || 0}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function CitationsTimelineChart({ data }: CitationsTimelineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Domain Citations Over Time</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track citation gains and losses over time
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="gained" fill="hsl(var(--chart-1))" name="Citations Gained" />
              <Bar dataKey="lost" fill="hsl(var(--chart-2))" name="Citations Lost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

