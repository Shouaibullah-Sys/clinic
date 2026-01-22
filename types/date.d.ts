//types/date.ts

import { DateRange as ReactDayPickerDateRange } from 'react-day-picker';

// Create a compatible date range type
export type DateRange = {
  start: Date;
  end: Date;
} | ReactDayPickerDateRange;

// Utility function to convert between types
export const toStartEndDate = (range?: DateRange) => {
  if (!range) return undefined;
  
  if ('start' in range && 'end' in range) {
    return range;
  }
  
  if ('from' in range && 'to' in range) {
    return {
      start: range.from || new Date(),
      end: range.to || new Date()
    };
  }
  
  return undefined;
};
