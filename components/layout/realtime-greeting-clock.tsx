"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { getGreetingLabel, getGreetingPeriod, getLocalDateKey, resolveAppTimeZone } from "@/lib/time";

const fullDateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const compactDateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const timeFormatter = (timeZone: string, includeSeconds: boolean) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: true,
  });

export const RealtimeGreetingClock = memo(function RealtimeGreetingClock({
  name,
  tenantTimezone,
  branchTimezone,
  userTimezone,
  onPeriodBoundary,
}: {
  name?: string | null;
  tenantTimezone?: string | null;
  branchTimezone?: string | null;
  userTimezone?: string | null;
  onPeriodBoundary?: (input: { period: string; localDate: string; timeZone: string }) => void;
}) {
  const [browserTimezone, setBrowserTimezone] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setBrowserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const timeZone = useMemo(
    () => resolveAppTimeZone({ tenantTimezone, branchTimezone, userTimezone, browserTimezone }),
    [tenantTimezone, branchTimezone, userTimezone, browserTimezone],
  );

  const boundaryKey = useMemo(() => {
    if (!now) return null;
    return `${getLocalDateKey(now, timeZone)}:${getGreetingPeriod(now, timeZone)}`;
  }, [now, timeZone]);

  useEffect(() => {
    if (!now || !boundaryKey || !onPeriodBoundary) return;
    onPeriodBoundary({
      period: getGreetingPeriod(now, timeZone),
      localDate: getLocalDateKey(now, timeZone),
      timeZone,
    });
  }, [boundaryKey, now, onPeriodBoundary, timeZone]);

  const greeting = now ? getGreetingLabel(now, timeZone) : "";
  const fullDate = now ? fullDateFormatter(timeZone).format(now) : "";
  const compactDate = now ? compactDateFormatter(timeZone).format(now) : "";
  const fullTime = now ? timeFormatter(timeZone, true).format(now) : "";
  const compactTime = now ? timeFormatter(timeZone, false).format(now) : "";
  const displayName = name?.trim();

  return (
    <div className="min-w-0 flex-1 px-1 sm:px-2 md:max-w-[260px] lg:max-w-md">
      <p className="truncate text-sm font-semibold leading-tight text-foreground">
        {greeting}
        {displayName ? `, ${displayName}` : ""}
      </p>
      <p className="truncate text-[11px] text-muted-foreground lg:hidden">
        {compactDate} | {compactTime}
      </p>
      <div className="hidden lg:block">
        <p className="truncate text-xs text-muted-foreground">{fullDate}</p>
        <p className="truncate text-xs font-medium text-muted-foreground">{fullTime}</p>
      </div>
    </div>
  );
});
