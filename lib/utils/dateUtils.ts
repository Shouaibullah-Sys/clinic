import { format, parseISO, isValid, addDays, addMinutes, isToday, isSameDay, isPast, isFuture } from "date-fns";

export class DateUtils {
  // Formatting
  static formatDate(date: Date | string, formatStr = "yyyy-MM-dd"): string {
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      if (!isValid(dateObj)) return "Invalid date";
      return format(dateObj, formatStr);
    } catch {
      return "Invalid date";
    }
  }
  
  static formatDateTime(date: Date | string, formatStr = "yyyy-MM-dd HH:mm"): string {
    return this.formatDate(date, formatStr);
  }
  
  static formatTime(date: Date | string, formatStr = "HH:mm"): string {
    return this.formatDate(date, formatStr);
  }
  
  static formatDisplayDate(date: Date | string): string {
    return this.formatDate(date, "EEEE, MMMM d, yyyy");
  }
  
  static formatDisplayDateTime(date: Date | string): string {
    return this.formatDate(date, "MMM d, yyyy 'at' h:mm a");
  }
  
  // Validation
  static isValidDate(date: Date | string): boolean {
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      return isValid(dateObj);
    } catch {
      return false;
    }
  }
  
  static isValidDateString(dateStr: string): boolean {
    return this.isValidDate(parseISO(dateStr));
  }
  
  static isFutureDate(date: Date | string): boolean {
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      return isFuture(dateObj);
    } catch {
      return false;
    }
  }
  
  static isPastDate(date: Date | string): boolean {
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      return isPast(dateObj);
    } catch {
      return false;
    }
  }
  
  static isTodayDate(date: Date | string): boolean {
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      return isToday(dateObj);
    } catch {
      return false;
    }
  }
  
  // Calculations
  static addMinutes(date: Date | string, minutes: number): Date {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return addMinutes(dateObj, minutes);
  }
  
  static addDays(date: Date | string, days: number): Date {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return addDays(dateObj, days);
  }
  
  // Date ranges
  static getDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    let current = new Date(start);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }
  
  static getNextWeekdays(count: number, startFrom = new Date()): Date[] {
    const weekdays: Date[] = [];
    let current = new Date(startFrom);
    
    while (weekdays.length < count) {
      if (current.getDay() !== 0 && current.getDay() !== 6) { // Skip weekends
        weekdays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return weekdays;
  }
  
  // Time calculations
  static calculateDuration(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
  }
  
  static calculateAge(birthDate: Date | string): number {
    const birth = typeof birthDate === "string" ? parseISO(birthDate) : birthDate;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }
  
  // Appointment specific
  static generateAppointmentTimeSlots(
    startTime: string = "09:00",
    endTime: string = "17:00",
    duration: number = 20,
    breakStart?: string,
    breakEnd?: string
  ): string[] {
    const slots: string[] = [];
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    
    let current = new Date();
    current.setHours(startHour, startMinute, 0, 0);
    
    const end = new Date();
    end.setHours(endHour, endMinute, 0, 0);
    
    while (current < end) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      
      // Skip break time
      if (breakStart && breakEnd) {
        const [breakStartHour, breakStartMinute] = breakStart.split(":").map(Number);
        const [breakEndHour, breakEndMinute] = breakEnd.split(":").map(Number);
        
        const breakStartTime = new Date();
        breakStartTime.setHours(breakStartHour, breakStartMinute, 0, 0);
        
        const breakEndTime = new Date();
        breakEndTime.setHours(breakEndHour, breakEndMinute, 0, 0);
        
        if (current >= breakStartTime && slotEnd <= breakEndTime) {
          current = breakEndTime;
          continue;
        }
      }
      
      if (slotEnd <= end) {
        slots.push(this.formatTime(current));
      }
      
      current = slotEnd;
    }
    
    return slots;
  }
  
  // Timezone utilities
  static convertToUTC(date: Date | string): Date {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return new Date(dateObj.toISOString());
  }
  
  static convertFromUTC(date: Date | string, timezone: string = "local"): Date {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (timezone === "local") {
      return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
    }
    return dateObj;
  }
}

export const formatDate = DateUtils.formatDate;
export const formatDateTime = DateUtils.formatDateTime;
export const formatDisplayDate = DateUtils.formatDisplayDate;
export const isValidDate = DateUtils.isValidDate;
export const isFutureDate = DateUtils.isFutureDate;
export const isTodayDate = DateUtils.isTodayDate;