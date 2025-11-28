"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
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
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRangeValue;
  onChange?: (range: DateRangeValue) => void;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(
    value ? { from: value.from, to: value.to } : undefined
  );

  // Sync selectedRange with value when value changes (from parent)
  React.useEffect(() => {
    if (value) {
      setSelectedRange({ from: value.from, to: value.to });
    }
  }, [value]);

  // Sync selectedRange with value when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && value) {
      // Reset to applied value when opening
      setSelectedRange({ from: value.from, to: value.to });
    }
  };

  const handleSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    // Don't close automatically - wait for Apply button
  };

  const handleApply = () => {
    if (selectedRange?.from && selectedRange?.to) {
      onChange?.({ from: selectedRange.from, to: selectedRange.to });
      setOpen(false);
    }
  };

  const getQuickFilterRange = (filterType: "today" | "lastWeek" | "lastMonth"): DateRange => {
    const now = new Date();
    switch (filterType) {
      case "today":
        return {
          from: startOfDay(now),
          to: endOfDay(now),
        };
      case "lastWeek":
        return {
          from: startOfDay(subDays(now, 6)), // Last 7 days including today
          to: endOfDay(now),
        };
      case "lastMonth":
        return {
          from: startOfDay(subDays(now, 29)), // Last 30 days
          to: endOfDay(now),
        };
    }
  };

  const handleQuickFilter = (filterType: "today" | "lastWeek" | "lastMonth") => {
    const range = getQuickFilterRange(filterType);
    setSelectedRange(range);
    onChange?.({ from: range.from, to: range.to });
    setOpen(false);
  };

  // Detect which quick filter matches the current value (if any)
  const getActiveQuickFilter = (): "today" | "lastWeek" | "lastMonth" | null => {
    if (!value?.from || !value?.to) return null;

    const now = new Date();
    const todayRange = getQuickFilterRange("today");
    const lastWeekRange = getQuickFilterRange("lastWeek");
    const lastMonthRange = getQuickFilterRange("lastMonth");

    // Helper to compare dates (same day, ignoring time)
    const isSameDay = (date1: Date, date2: Date) => {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    };

    // Check if value matches today
    if (
      isSameDay(value.from, todayRange.from!) &&
      isSameDay(value.to, todayRange.to!)
    ) {
      return "today";
    }

    // Check if value matches last week
    if (
      isSameDay(value.from, lastWeekRange.from!) &&
      isSameDay(value.to, lastWeekRange.to!)
    ) {
      return "lastWeek";
    }

    // Check if value matches last month
    if (
      isSameDay(value.from, lastMonthRange.from!) &&
      isSameDay(value.to, lastMonthRange.to!)
    ) {
      return "lastMonth";
    }

    return null;
  };

  // Always show applied value (value) in trigger, not temporary selection
  const displayRange = value;
  const activeQuickFilter = getActiveQuickFilter();

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !displayRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayRange?.from ? (
              displayRange.to ? (
                <>
                  {format(displayRange.from, "LLL dd, y")} -{" "}
                  {format(displayRange.to, "LLL dd, y")}
                </>
              ) : (
                format(displayRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            {/* Quick Filters */}
            <div className="flex gap-2 mb-3 pb-3 border-b">
              <Button
                variant={activeQuickFilter === "today" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleQuickFilter("today")}
              >
                Today
              </Button>
              <Button
                variant={activeQuickFilter === "lastWeek" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleQuickFilter("lastWeek")}
              >
                Last Week
              </Button>
              <Button
                variant={activeQuickFilter === "lastMonth" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleQuickFilter("lastMonth")}
              >
                Last Month
              </Button>
            </div>
            
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={selectedRange?.from || new Date()}
              selected={selectedRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
            />
            {selectedRange?.from && selectedRange?.to && (
              <div className="flex items-center justify-between border-t pt-3 mt-3">
                <div className="text-sm text-muted-foreground">
                  {format(selectedRange.from, "LLL dd, y")} -{" "}
                  {format(selectedRange.to, "LLL dd, y")}
                </div>
                <Button size="sm" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
