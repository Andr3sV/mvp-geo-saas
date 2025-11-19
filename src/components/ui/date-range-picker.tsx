"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, startOfYear, subMonths } from "date-fns";
import { DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "Year to date", value: "ytd", days: null },
  { label: "Last 12 months", value: "12m", days: 365 },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    value ? { from: value.from, to: value.to } : undefined
  );

  const handlePresetClick = (preset: typeof presets[0]) => {
    let from: Date;
    const to = new Date();

    if (preset.value === "ytd") {
      from = startOfYear(to);
    } else if (preset.days) {
      from = subDays(to, preset.days - 1);
    } else {
      return;
    }

    const newRange = { from, to, preset: preset.value };
    setDateRange({ from, to });
    onChange?.(newRange);
    setOpen(false);
  };

  const handleSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onChange?.({
        from: range.from,
        to: range.to,
        preset: "custom",
      });
      setOpen(false);
    }
  };

  const formatDateRange = () => {
    if (value?.from && value?.to) {
      return `${format(value.from, "MMM d")} - ${format(value.to, "MMM d, yyyy")}`;
    }
    return "Select date range";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Sidebar with presets */}
          <div className="border-r">
            <div className="p-2 space-y-1">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors",
                    value?.preset === preset.value && "bg-accent"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="p-3">
            <DayPicker
              mode="range"
              selected={dateRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              className={cn("rdp-custom")}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
