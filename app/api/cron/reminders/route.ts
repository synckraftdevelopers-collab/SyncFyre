import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { queueSubscriptionReminders } from "@/services/notification.service";

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET; const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided || Buffer.byteLength(expected) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await queueSubscriptionReminders()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Reminder job failed" }, { status: 500 }); }
}
