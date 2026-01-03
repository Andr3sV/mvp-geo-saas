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
    // Get today as the maximum selectable date (today is now included)
    const today = new Date();
    const todayStart = startOfDay(today);
    
    switch (filterType) {
      case "currentWeek": {
        // Current week: Monday to today (including today)
        // startOfWeek with { weekStartsOn: 1 } gives us Monday
        const weekStart = startOfWeek(todayStart, { weekStartsOn: 1 }); // Monday of current week
        // End at today (inclusive)
        return {
          from: startOfDay(weekStart),
          to: endOfDay(todayStart),
        };
      }
      case "pastWeek": {
        // Past week: Monday to Sunday of previous week
        const pastWeekDate = subWeeks(todayStart, 1);
        const pastWeekStart = startOfWeek(pastWeekDate, { weekStartsOn: 1 }); // Monday of past week
        const pastWeekEnd = endOfWeek(pastWeekDate, { weekStartsOn: 1 }); // Sunday of past week
        return {
          from: startOfDay(pastWeekStart),
          to: endOfDay(pastWeekEnd),
        };
      }
      case "currentMonth": {
        // Current month: from start of current month to today (inclusive)
        const monthStart = startOfMonth(todayStart);
        return {
          from: startOfDay(monthStart),
          to: endOfDay(todayStart),
        };
      }
      case "pastMonth": {
        // Past month: complete previous month
        const pastMonth = subMonths(todayStart, 1);
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

  // Get display text for the button
  const getDisplayText = () => {
    if (activeQuickFilter === "currentWeek") return "Current Week";
    if (activeQuickFilter === "pastWeek") return "Past Week";
    if (activeQuickFilter === "currentMonth") return "Current Month";
    if (activeQuickFilter === "pastMonth") return "Past Month";
    
    if (displayRange?.from && displayRange?.to) {
      // Calculate days difference
      const daysDiff = Math.ceil((displayRange.to.getTime() - displayRange.from.getTime()) / (1000 * 60 * 60 * 24));
      
      // Show "Last X Days" format for common ranges
      if (daysDiff === 7) return "Last 7 Days";
      if (daysDiff === 30) return "Last 30 Days";
      if (daysDiff === 90) return "Last 90 Days";
      
      // Otherwise show compact date range
      return `${format(displayRange.from, "MMM dd")} - ${format(displayRange.to, "MMM dd")}`;
    }
    
    if (displayRange?.from) {
      return format(displayRange.from, "MMM dd, y");
    }
    
    return "Pick a date range";
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal gap-2",
              !displayRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{getDisplayText()}</span>
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
                // Block future dates only (today is now included)
                const today = startOfDay(new Date());
                return date > today;
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
