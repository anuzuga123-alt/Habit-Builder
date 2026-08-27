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
 * Fast UTC date string formatter (YYYY-MM-DD) avoiding full ISO string allocations.
 */
export function formatUTCDateStr(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
}

/**
 * Returns the short day code ('mon', 'tue', etc.) for a date string 'YYYY-MM-DD'
 * Uses Sakamoto's algorithm for zero-allocation O(1) day-of-week calculation.
 */
export function getDayOfWeekFromDateString(dateStr: string): DayOfWeek {
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7));
  const day = Number(dateStr.slice(8, 10));

  let y = year;
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (month < 3) y -= 1;
  const dayNum = Math.floor(y + y / 4 - y / 100 + y / 400 + t[month - 1] + day) % 7;
  return DAYS_MAP[dayNum];
}

/**
 * Formats time '06:30:00' or '06:30' into '06:30'
 */
export function formatShortTime(timeStr: string): string {
  if (!timeStr) return '08:00';
  const parts = timeStr.split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

/**
 * Returns the Monday (start) and Sunday (end) date strings (YYYY-MM-DD) for the week containing dateStr.
 */
export function getWeekDateRange(dateStr: string): { startOfWeek: string; endOfWeek: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 is Sun, 1 is Mon, ... 6 is Sat

  // Distance to Monday (if Sunday (0), distance back is 6 days; otherwise dayOfWeek - 1)
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  return {
    startOfWeek: formatDate(monday),
    endOfWeek: formatDate(sunday),
  };
}
