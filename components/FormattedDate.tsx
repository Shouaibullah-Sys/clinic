// components/FormattedDate.tsx

"use client";

import { format } from "date-fns";

interface FormattedDateProps {
  date: string | undefined | null;
  format?: string;
  fallback?: React.ReactNode;
  className?: string;
}

export function FormattedDate({ 
  date, 
  format: formatStr = "MMM dd, yyyy HH:mm", 
  fallback = "N/A",
  className = "" 
}: FormattedDateProps) {
  if (!date) {
    return <span className={className}>{fallback}</span>;
  }
  
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      console.warn(`Invalid date string: ${date}`);
      return <span className={className}>{fallback}</span>;
    }
    
    return (
      <span className={className}>
        {format(parsedDate, formatStr)}
      </span>
    );
  } catch (error) {
    console.error('Date formatting error:', error);
    return <span className={className}>{fallback}</span>;
  }
}

// Component for date only
export function FormattedDateOnly({ 
  date, 
  fallback = "N/A",
  className = "" 
}: Omit<FormattedDateProps, 'format'>) {
  return (
    <FormattedDate 
      date={date} 
      format="MMM dd, yyyy" 
      fallback={fallback} 
      className={className} 
    />
  );
}

// Component for time only
export function FormattedTimeOnly({ 
  date, 
  fallback = "N/A",
  className = "" 
}: Omit<FormattedDateProps, 'format'>) {
  return (
    <FormattedDate 
      date={date} 
      format="HH:mm" 
      fallback={fallback} 
      className={className} 
    />
  );
}