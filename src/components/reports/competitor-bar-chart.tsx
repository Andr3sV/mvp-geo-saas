"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { CompetitorMetric } from "@/lib/queries/detailed-report";
import { cn } from "@/lib/utils";

interface CompetitorBarChartProps {
  data: CompetitorMetric[];
  brandValue: number;
  brandName: string;
  isLoading?: boolean;
  valueFormat?: "number" | "percentage" | "decimal";
}

const COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
  "#ef4444", // red
];

export function CompetitorBarChart({
  data,
  brandValue,
  brandName,
  isLoading = false,
  valueFormat = "number",
}: CompetitorBarChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  // Prepare chart data with brand included
  const chartData = [
    {
      name: brandName,
      value: brandValue,
      percentageChange: 0,
      isBrand: true,
    },
    ...data.map((comp) => ({
      name: comp.name.length > 20 ? comp.name.substring(0, 20) + "..." : comp.name,
      fullName: comp.name,
      value: comp.value,
      percentageChange: comp.percentageChange,
      isBrand: false,
    })),
  ].slice(0, 11); // Top 10 competitors + brand

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isBrand = data.isBrand;
      const change = data.percentageChange;

      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.fullName || data.name}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Value: </span>
            <span className="font-medium">
              {valueFormat === "percentage"
                ? `${data.value.toFixed(1)}%`
                : valueFormat === "decimal"
                ? data.value.toFixed(2)
                : typeof data.value === "number"
                ? data.value.toLocaleString()
                : data.value}
            </span>
          </p>
          {!isBrand && Math.abs(change) > 0.01 && (
            <p className="text-xs mt-1 flex items-center gap-1">
              {change > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{change.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{change.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs previous period</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11 }}
          className="font-medium"
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.isBrand
                  ? "#3b82f6"
                  : COLORS[index % COLORS.length]
              }
              opacity={entry.isBrand ? 1 : 0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

