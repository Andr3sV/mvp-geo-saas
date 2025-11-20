"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  description?: string;
}

export function MetricCard({
  title,
  value,
  trend,
  icon,
  description,
}: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.direction === "up") return "text-green-600";
    if (trend.direction === "down") return "text-red-600";
    return "text-gray-500";
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === "up")
      return <ArrowUp className="h-4 w-4" />;
    if (trend.direction === "down")
      return <ArrowDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardContent className="px-6 py-1">
        <div className="flex items-start justify-between h-full">
          <div className="flex-1 min-h-[60px] flex flex-col justify-between">
            <p className="text-sm font-medium text-muted-foreground leading-tight mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold leading-none">{value}</p>
              {trend && (
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}
                >
                  {getTrendIcon()}
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground leading-tight mt-1">{description}</p>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 text-muted-foreground ml-2">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

