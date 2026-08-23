import { DayOfWeek } from '../types';

export const DAYS_MAP: Record<number, DayOfWeek> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

/**
 * Returns formatted date string YYYY-MM-DD for a given date in specified timezone or local time.
 */
export function getFormattedDateString(date: Date = new Date(), timeZone?: string): string {
  try {
    if (timeZone) {
      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      };
      const formatter = new Intl.DateTimeFormat('en-CA', options);
      return formatter.format(date); // Output is YYYY-MM-DD
    }
  } catch {
    // Fall back to local date if timezone is invalid
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object or date string into readable format, e.g. "Wednesday, Feb 26, 2025"
 */
export function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns the short day code ('mon', 'tue', etc.) for a date string 'YYYY-MM-DD'
 */
export function getDayOfWeekFromDateString(dateStr: string): DayOfWeek {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return DAYS_MAP[date.getDay()];
}

/**
 * Formats time '06:30:00' or '06:30' into '06:30'
 */
export function formatShortTime(timeStr: string): string {
  if (!timeStr) return '08:00';
  const parts = timeStr.split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}
