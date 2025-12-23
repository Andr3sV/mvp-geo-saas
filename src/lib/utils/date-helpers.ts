import { startOfWeek } from "date-fns";
import { DateRangeValue } from "@/components/ui/date-range-picker";

/**
 * Get the current week date range (Monday to today)
 * @returns DateRangeValue with from = Monday 00:00:00, to = today end of day
 */
export function getCurrentWeekDateRange(): DateRangeValue {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  monday.setHours(0, 0, 0, 0); // Start of Monday
  
  return {
    from: monday,
    to: today,
  };
}

