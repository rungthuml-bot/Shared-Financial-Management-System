/**
 * Centralized Date & Timezone Utilities for Installment Manager
 * Ensures consistent handling for Thailand (Asia/Bangkok, UTC+7).
 */

export const APP_TIMEZONE = "Asia/Bangkok";

export const THAI_MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export const THAI_SHORT_MONTH_NAMES = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

/**
 * Format a Date or date string to Thai localized date string in Asia/Bangkok.
 * Example: "5 ต.ค. 2569"
 */
export function formatThaiDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Format a Date to Thai localized date and time in Asia/Bangkok.
 * Example: "5 ต.ค. 2569 14:30"
 */
export function formatThaiDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Format a year and month or a Date into Thai month name and year.
 * Examples:
 * - formatThaiMonthYear(2026, 10) => "ตุลาคม 2026"
 * - formatThaiMonthYear(new Date("2026-10-05")) => "ตุลาคม 2026"
 * - formatThaiMonthYear(2026, 10, { buddhistEra: true }) => "ตุลาคม 2569"
 */
export function formatThaiMonthYear(
  dateOrYear: Date | string | number,
  optionalMonthOrOptions?: number | { buddhistEra?: boolean },
  options?: { buddhistEra?: boolean }
): string {
  let year: number;
  let month: number;
  let opts: { buddhistEra?: boolean } | undefined;

  if (typeof dateOrYear === "number") {
    year = dateOrYear;
    month = typeof optionalMonthOrOptions === "number" ? optionalMonthOrOptions : 1;
    opts = options;
  } else {
    const parts = getBangkokDateParts(dateOrYear);
    year = parts.year;
    month = parts.month;
    opts = typeof optionalMonthOrOptions === "object" ? optionalMonthOrOptions : options;
  }

  const safeMonth = Math.min(Math.max(1, month), 12);
  const monthName = THAI_MONTH_NAMES[safeMonth - 1];
  const displayYear = opts?.buddhistEra ? year + 543 : year;
  return `${monthName} ${displayYear}`;
}

/**
 * Extract calendar date parts (year, month 1-12, day) in Asia/Bangkok timezone.
 */
export function getBangkokDateParts(date: Date | string = new Date()): {
  year: number;
  month: number; // 1-12
  day: number;
  hours: number;
  minutes: number;
} {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let day = d.getDate();
  let hours = d.getHours();
  let minutes = d.getMinutes();

  for (const part of parts) {
    if (part.type === "year") year = parseInt(part.value, 10);
    if (part.type === "month") month = parseInt(part.value, 10);
    if (part.type === "day") day = parseInt(part.value, 10);
    if (part.type === "hour") hours = parseInt(part.value, 10);
    if (part.type === "minute") minutes = parseInt(part.value, 10);
  }

  return { year, month, day, hours, minutes };
}

/**
 * Get accurate UTC Date boundaries for a specified month in Asia/Bangkok.
 * Month is 1-indexed (1 = January, 12 = December).
 */
export function getBangkokMonthRange(
  year: number,
  month: number
): {
  startDate: Date;
  endDate: Date;
  start: Date;
  end: Date;
  totalDaysInMonth: number;
  firstDayOfWeek: number;
} {
  // Month is 1-12
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, totalDaysInMonth, 23, 59, 59, 999));
  
  // Calculate first day of week (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  return {
    startDate,
    endDate,
    start: startDate,
    end: endDate,
    totalDaysInMonth,
    firstDayOfWeek,
  };
}
