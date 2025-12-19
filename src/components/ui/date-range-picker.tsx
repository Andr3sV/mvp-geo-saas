"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
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

  const getQuickFilterRange = (filterType: "currentWeek" | "pastWeek" | "currentMonth" | "pastMonth"): DateRange => {
    // Get yesterday as the maximum selectable date (today is blocked)
    const yesterday = subDays(new Date(), 1);
    const yesterdayStart = startOfDay(yesterday);
    
    switch (filterType) {
      case "currentWeek": {
        // Current week: Monday to Sunday of current week (ending at yesterday if before Sunday)
        // startOfWeek with { weekStartsOn: 1 } gives us Monday
        const weekStart = startOfWeek(yesterdayStart, { weekStartsOn: 1 }); // Monday of current week
        // endOfWeek with { weekStartsOn: 1 } gives us Sunday
        const weekEnd = endOfWeek(yesterdayStart, { weekStartsOn: 1 }); // Sunday of current week
        // Cap at yesterday if Sunday hasn't arrived yet
        const actualEnd = weekEnd > yesterdayStart ? yesterdayStart : weekEnd;
        return {
          from: startOfDay(weekStart),
          to: endOfDay(actualEnd),
        };
      }
      case "pastWeek": {
        // Past week: Monday to Sunday of previous week
        const pastWeekDate = subWeeks(yesterdayStart, 1);
        const pastWeekStart = startOfWeek(pastWeekDate, { weekStartsOn: 1 }); // Monday of past week
        const pastWeekEnd = endOfWeek(pastWeekDate, { weekStartsOn: 1 }); // Sunday of past week
        return {
          from: startOfDay(pastWeekStart),
          to: endOfDay(pastWeekEnd),
        };
      }
      case "currentMonth": {
        // Current month: from start of current month to yesterday
        const monthStart = startOfMonth(yesterdayStart);
        return {
          from: startOfDay(monthStart),
          to: endOfDay(yesterdayStart),
        };
      }
      case "pastMonth": {
        // Past month: complete previous month
        const pastMonth = subMonths(yesterdayStart, 1);
        const pastMonthStart = startOfMonth(pastMonth);
        const pastMonthEnd = endOfMonth(pastMonth);
        return {
          from: startOfDay(pastMonthStart),
          to: endOfDay(pastMonthEnd),
        };
      }
    }
  };

  const handleQuickFilter = (filterType: "currentWeek" | "pastWeek" | "currentMonth" | "pastMonth") => {
    const range = getQuickFilterRange(filterType);
    setSelectedRange(range);
    onChange?.({ from: range.from, to: range.to });
    setOpen(false);
  };

  // Detect which quick filter matches the current value (if any)
  const getActiveQuickFilter = (): "currentWeek" | "pastWeek" | "currentMonth" | "pastMonth" | null => {
    if (!value?.from || !value?.to) return null;

    // Helper to compare dates (same day, ignoring time)
    const isSameDay = (date1: Date, date2: Date) => {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    };

    // Check each filter type
    const filters: Array<"currentWeek" | "pastWeek" | "currentMonth" | "pastMonth"> = [
      "currentWeek",
      "pastWeek",
      "currentMonth",
      "pastMonth",
    ];

    for (const filterType of filters) {
      const range = getQuickFilterRange(filterType);
      if (
        isSameDay(value.from, range.from!) &&
        isSameDay(value.to, range.to!)
      ) {
        return filterType;
      }
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
            <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b">
              <Button
                variant={activeQuickFilter === "currentWeek" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handleQuickFilter("currentWeek")}
              >
                Current Week
              </Button>
              <Button
                variant={activeQuickFilter === "pastWeek" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handleQuickFilter("pastWeek")}
              >
                Past Week
              </Button>
              <Button
                variant={activeQuickFilter === "currentMonth" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handleQuickFilter("currentMonth")}
              >
                Current Month
              </Button>
              <Button
                variant={activeQuickFilter === "pastMonth" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handleQuickFilter("pastMonth")}
              >
                Past Month
              </Button>
            </div>
            
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={selectedRange?.from || new Date()}
              selected={selectedRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={(date) => {
                // Block today and future dates (today's data won't be available until tomorrow)
                const today = startOfDay(new Date());
                return date >= today;
              }}
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
