import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runNotificationAutomation } from "@/services/notification.service";

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET; const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided || Buffer.byteLength(expected) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await runNotificationAutomation()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Notification automation job failed" }, { status: 500 }); }
}
