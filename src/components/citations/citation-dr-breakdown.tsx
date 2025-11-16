"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface DRBreakdownData {
  high: number;
  medium: number;
  low: number;
  unverified: number;
}

interface CitationDRBreakdownProps {
  data: DRBreakdownData;
}

const COLORS = {
  high: "hsl(var(--chart-1))", // Green
  medium: "hsl(var(--chart-2))", // Blue
  low: "hsl(var(--chart-3))", // Orange
  unverified: "hsl(var(--chart-4))", // Gray
};

const LABELS = {
  high: "High Authority (80-100)",
  medium: "Medium Authority (60-79)",
  low: "Low Authority (40-59)",
  unverified: "Unverified (<40)",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold">{payload[0]?.name}</p>
        <p className="text-sm">
          Citations: <span className="font-bold">{payload[0]?.value}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {((Number(payload[0]?.value) / Number(payload[0]?.payload?.total)) * 100).toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

export function CitationDRBreakdown({ data }: CitationDRBreakdownProps) {
  const chartData = [
    {
      name: LABELS.high,
      value: data.high,
      color: COLORS.high,
      tier: "high",
      total: data.high + data.medium + data.low + data.unverified,
    },
    {
      name: LABELS.medium,
      value: data.medium,
      color: COLORS.medium,
      tier: "medium",
      total: data.high + data.medium + data.low + data.unverified,
    },
    {
      name: LABELS.low,
      value: data.low,
      color: COLORS.low,
      tier: "low",
      total: data.high + data.medium + data.low + data.unverified,
    },
    {
      name: LABELS.unverified,
      value: data.unverified,
      color: COLORS.unverified,
      tier: "unverified",
      total: data.high + data.medium + data.low + data.unverified,
    },
  ].filter((item) => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Citation DR Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Citations categorized by source authority level
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) =>
                  name ? `${name.split(" ")[0]}: ${(percent * 100).toFixed(0)}%` : ""
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

