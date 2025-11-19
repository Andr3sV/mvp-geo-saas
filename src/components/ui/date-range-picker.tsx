"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Check } from "lucide-react";
import { format, subDays, startOfYear, subMonths } from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRangeValue {
  from: Date;
  to: Date;
  preset?: string;
}

interface DateRangePickerProps {
  value?: DateRangeValue;
  onChange?: (range: DateRangeValue) => void;
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
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(
    value && value.preset === "custom" ? { from: value.from, to: value.to } : undefined
  );
  
  const selectedPreset = value?.preset || "30d";
  const selectedRange = value || presets.find(p => p.value === "30d")!.getRange();

  const handlePresetSelect = (preset: typeof presets[0]) => {
    const range = preset.getRange();
    onChange?.({
      ...range,
      preset: preset.value,
    });
    setShowCalendar(false);
    setOpen(false);
  };

  const handleCustomClick = () => {
    setShowCalendar(true);
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
  };

  const applyCustomRange = () => {
    if (customRange?.from && customRange?.to) {
      onChange?.({
        from: customRange.from,
        to: customRange.to,
        preset: "custom",
      });
      setShowCalendar(false);
      setOpen(false);
    }
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
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <span className="flex-1">{formatDateRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {!showCalendar ? (
          // Presets view
          <div className="w-[240px]">
            <div className="border-b p-3">
              <p className="text-sm font-medium">Select date range</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a preset or custom range
              </p>
            </div>
            <div className="p-2">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "relative flex w-full items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    selectedPreset === preset.value && value?.preset !== "custom" && "bg-accent"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedPreset === preset.value && value?.preset !== "custom"
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span className="flex-1 text-left">{preset.label}</span>
                </button>
              ))}
              <div className="my-1 border-t" />
              <button
                onClick={handleCustomClick}
                className={cn(
                  "relative flex w-full items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  value?.preset === "custom" && "bg-accent"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value?.preset === "custom" ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex-1 text-left">Custom range...</span>
              </button>
            </div>
          </div>
        ) : (
          // Calendar view
          <div className="p-3">
            <div className="mb-3">
              <button
                onClick={() => setShowCalendar(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to presets
              </button>
            </div>
            <Calendar
              mode="range"
              defaultMonth={subDays(new Date(), 30)}
              selected={customRange}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
            />
            {customRange?.from && customRange?.to && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-sm text-muted-foreground">
                  {format(customRange.from, "MMM d, yyyy")} - {format(customRange.to, "MMM d, yyyy")}
                </span>
                <Button size="sm" onClick={applyCustomRange}>
                  Apply
                </Button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
