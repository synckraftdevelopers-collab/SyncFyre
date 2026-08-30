import test from "node:test";
import assert from "node:assert/strict";
import { addCalendarMonthsToDateOnly, getLocalDateInputValue } from "../lib/membership-dates.ts";

test("same plan plus same start date produces the same expiry", () => {
  const first = addCalendarMonthsToDateOnly("2026-08-28", 1);
  const second = addCalendarMonthsToDateOnly("2026-08-28", 1);
  assert.equal(first, "2026-09-28");
  assert.equal(second, "2026-09-28");
  assert.equal(first, second);
});

test("configured month durations produce the expected expiry dates", () => {
  assert.equal(addCalendarMonthsToDateOnly("2026-08-28", 1), "2026-09-28");
  assert.equal(addCalendarMonthsToDateOnly("2026-08-28", 3), "2026-11-28");
  assert.equal(addCalendarMonthsToDateOnly("2026-08-28", 6), "2027-02-28");
  assert.equal(addCalendarMonthsToDateOnly("2026-08-28", 12), "2027-08-28");
});

test("month-end dates clamp safely instead of overflowing", () => {
  assert.equal(addCalendarMonthsToDateOnly("2026-01-31", 1), "2026-02-28");
  assert.equal(addCalendarMonthsToDateOnly("2028-01-31", 1), "2028-02-29");
  assert.equal(addCalendarMonthsToDateOnly("2026-10-31", 4), "2027-02-28");
});

test("local date input values use the local calendar date", () => {
  const localDate = new Date(2026, 7, 30, 0, 30, 0);
  assert.equal(getLocalDateInputValue(localDate), "2026-08-30");
});
