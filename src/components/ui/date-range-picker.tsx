"use client";

import * as React from "react";
import { Calendar, Check } from "lucide-react";
import { format, subDays, startOfYear, subMonths } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRange {
  from: Date;
  to: Date;
  preset?: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
}

const presets = [
  {
    label: "Last 7 days",
    value: "7d",
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 days",
    value: "30d",
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: "Last 90 days",
    value: "90d",
    getRange: () => ({
      from: subDays(new Date(), 89),
      to: new Date(),
    }),
  },
  {
    label: "Year to date",
    value: "ytd",
    getRange: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
  {
    label: "Last 12 months",
    value: "12m",
    getRange: () => ({
      from: subMonths(new Date(), 12),
      to: new Date(),
    }),
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  const selectedPreset = value?.preset || "30d";
  const selectedRange = value || presets.find(p => p.value === "30d")!.getRange();

  const handleSelect = (preset: typeof presets[0]) => {
    const range = preset.getRange();
    onChange?.({
      ...range,
      preset: preset.value,
    });
    setOpen(false);
  };

  const formatDateRange = () => {
    if (!selectedRange.from || !selectedRange.to) {
      return "Select date range";
    }
    
    const fromStr = format(selectedRange.from, "MMM d");
    const toStr = format(selectedRange.to, "MMM d, yyyy");
    
    return `${fromStr} - ${toStr}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-start text-left font-normal", className)}
        >
          <Calendar className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <span className="flex-1">{formatDateRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="flex flex-col">
          <div className="border-b p-3">
            <p className="text-sm font-medium">Date Range</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a time period for your analysis
            </p>
          </div>
          
          <div className="p-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleSelect(preset)}
                className={cn(
                  "relative flex w-full items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground",
                  selectedPreset === preset.value && "bg-accent"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedPreset === preset.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex-1 text-left">{preset.label}</span>
                <span className="text-xs text-muted-foreground">
                  {format(preset.getRange().from, "MMM d")} -{" "}
                  {format(preset.getRange().to, "MMM d")}
                </span>
              </button>
            ))}
          </div>
          
          {/* Custom date range - Coming soon */}
          <div className="border-t p-3">
            <button
              disabled
              className="w-full rounded-sm bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            >
              Custom range (coming soon)
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

