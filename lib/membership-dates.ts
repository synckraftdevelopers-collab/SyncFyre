import { format } from "date-fns";

function assertValidDateParts(year: number, monthIndex: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) {
    throw new Error("Invalid date parts.");
  }
}

export function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid date-only value.");

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  assertValidDateParts(year, monthIndex, day);

  const date = new Date(Date.UTC(year, monthIndex, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Invalid calendar date.");
  }

  return { year, monthIndex, day };
}

export function addCalendarMonthsToDateOnly(startDate: string, durationMonths: number) {
  if (!Number.isInteger(durationMonths) || durationMonths <= 0) {
    throw new Error("Plan duration must be a positive whole number of months.");
  }

  const { year, monthIndex, day } = parseDateOnly(startDate);
  const targetMonthIndex = monthIndex + durationMonths;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonthIndex + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  return format(new Date(Date.UTC(targetYear, normalizedMonthIndex, clampedDay)), "yyyy-MM-dd");
}

export function getLocalDateInputValue(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}
