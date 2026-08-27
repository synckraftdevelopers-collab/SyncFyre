export type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

const PERIOD_LABELS: Record<GreetingPeriod, string> = {
  morning: "Good Morning",
  afternoon: "Good Afternoon",
  evening: "Good Evening",
  night: "Good Night",
};

export function resolveAppTimeZone(input: {
  tenantTimezone?: string | null;
  branchTimezone?: string | null;
  userTimezone?: string | null;
  browserTimezone?: string | null;
}) {
  return input.tenantTimezone || input.branchTimezone || input.userTimezone || input.browserTimezone || "UTC";
}

function getDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
    second: Number(pick("second")),
  };
}

export function getGreetingPeriod(date: Date, timeZone: string): GreetingPeriod {
  const { hour } = getDateParts(date, timeZone);
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function getGreetingLabel(date: Date, timeZone: string) {
  return PERIOD_LABELS[getGreetingPeriod(date, timeZone)];
}

export function getLocalDateKey(date: Date, timeZone: string) {
  const { year, month, day } = getDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
