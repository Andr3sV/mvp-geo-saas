"use client";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CalendarDays, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReportPeriod = "yesterday" | "last-week" | "last-month" | "last-3-months";

interface PeriodOption {
  id: ReportPeriod;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const periods: PeriodOption[] = [
  {
    id: "yesterday",
    label: "Yesterday",
    description: "Previous day",
    icon: Clock,
  },
  {
    id: "last-week",
    label: "Last Week",
    description: "Last 7 days",
    icon: Calendar,
  },
  {
    id: "last-month",
    label: "Last Month",
    description: "Last 30 days",
    icon: CalendarDays,
  },
  {
    id: "last-3-months",
    label: "Last 3 Months",
    description: "Last 90 days",
    icon: CalendarRange,
  },
];

interface PeriodSelectorProps {
  selectedPeriod: ReportPeriod | null;
  onPeriodSelect: (period: ReportPeriod) => void;
  isLoading?: boolean;
}

export function PeriodSelector({
  selectedPeriod,
  onPeriodSelect,
  isLoading = false,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {periods.map((period) => {
            const Icon = period.icon;
            const isSelected = selectedPeriod === period.id;

            return (
              <Card
                key={period.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md border relative overflow-hidden group",
                  isSelected
                    ? "border-primary shadow-md bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-accent/50",
                  isLoading && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
                onClick={() => !isLoading && onPeriodSelect(period.id)}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-l-[18px] border-l-transparent border-t-[18px] border-t-primary" />
                )}
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center space-y-4 min-h-[120px] justify-center">
                    <div
                      className={cn(
                        "p-4 rounded-lg transition-all duration-200",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted group-hover:bg-muted/80"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5 w-full">
                      <CardTitle className="text-base font-semibold leading-tight">
                        {period.label}
                      </CardTitle>
                      <CardDescription className="text-xs leading-tight text-muted-foreground">
                        {period.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Choose the time period to generate your detailed report
        </p>
      </div>
    </div>
  );
}
