// lib/utils/date.ts

import { format } from "date-fns";

/**
 * Safely format a date string
 * @param dateString - The date string to format
 * @param formatStr - The format string (default: "MMM dd, yyyy HH:mm")
 * @param fallback - Fallback text if date is invalid (default: "N/A")
 * @returns Formatted date string or fallback
 */
export function safeFormatDate(
  dateString: string | undefined | null,
  formatStr: string = "MMM dd, yyyy HH:mm",
  fallback: string = "N/A"
): string {
  if (!dateString) return fallback;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string: ${dateString}`);
      return fallback;
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error);
    return fallback;
  }
}

/**
 * Check if a date string is valid
 * @param dateString - The date string to check
 * @returns boolean indicating if date is valid
 */
export function isValidDate(dateString: string | undefined | null): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Parse a date string safely
 * @param dateString - The date string to parse
 * @returns Date object or null if invalid
 */
export function safeParseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  return date;
}

/**
 * Format date for display with fallback
 */
export function formatDateDisplay(
  dateString: string | undefined | null,
  options: {
    format?: string;
    fallback?: string;
    includeTime?: boolean;
  } = {}
): string {
  const {
    format: formatStr,
    fallback = "N/A",
    includeTime = true
  } = options;

  if (!dateString) return fallback;
  
  const date = safeParseDate(dateString);
  if (!date) return fallback;
  
  try {
    if (formatStr) {
      return format(date, formatStr);
    }
    return format(date, includeTime ? "MMM dd, yyyy HH:mm" : "MMM dd, yyyy");
  } catch (error) {
    console.error('Date formatting error:', error);
    return fallback;
  }
}