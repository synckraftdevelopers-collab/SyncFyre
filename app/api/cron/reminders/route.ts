import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runNotificationAutomation } from "@/services/notification.service";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

// This job is meant to fire on a fixed cron schedule (a handful of times an
// hour at most); a low ceiling here mainly stops brute-forcing CRON_SECRET.
const CRON_LIMIT = 10;
const CRON_WINDOW_MS = 60_000;

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(`cron-reminders:${getClientIp(request)}`, CRON_LIMIT, CRON_WINDOW_MS);
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const expected = process.env.CRON_SECRET; const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided || Buffer.byteLength(expected) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await runNotificationAutomation()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Notification automation job failed" }, { status: 500 }); }
}
