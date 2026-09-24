import { NextRequest, NextResponse } from "next/server";
import { buildBiometricRequestMetadata } from "@/lib/biometric/http";
import { processBiometricPayload } from "@/services/biometric.service";

// ─── iClock/ADMS Handshake ────────────────────────────────────────────────────
//
// ZKTeco/ESSL devices running the iClock firmware use a two-step protocol:
//
//  Step 1 — Handshake (GET)
//    Machine:  GET /iclock/cdata?SN=<serial>&options=all&language=69&pushver=2.4.1&DeviceType=acc
//    Server:   Plain-text multi-line response containing:
//              GET OPTION ALL         — requests all device options
//              GET TIME               — requests time sync (machine sets its RTC)
//              GET STAMP              — the record timestamp the machine should upload FROM
//              GET OPTION ...         — any optional device commands
//
//  Step 2 — Upload (POST)
//    Only AFTER receiving a well-formed handshake response does the machine
//    POST its buffered ATTLOG attendance records to the same /iclock/cdata path.
//
// WITHOUT this handshake response the firmware either stays in polling-only mode
// or silently fails to upload — which is exactly the symptom observed after Sep 11:
// the machine keeps hitting GET /iclock/cdata (visible in PM2 logs) but never
// sends a POST, so no new attendance_sync_logs rows are created.
//
// The POST handler is left completely unchanged — it still runs through the full
// processBiometricPayload() pipeline for attendance event ingestion.
//
// Reference: ZKTeco iClock PUSH protocol spec (vendor documentation).
// Stamp value 0 means "send all records from the beginning" — the server-side
// duplicate detection in biometric.service.ts (exact + 90s window) handles
// any re-sends safely; re-uploaded events are marked "duplicate" and do not
// create double attendance rows.

function buildIclockHandshakeResponse(): string {
  // Format: each line is a key-value command. Lines are separated by \r\n.
  // GET STAMP:0  — "send all records you have buffered" (duplicate-safe).
  // GET OPTION ALL — fetch all device options (triggers machine to report settings).
  // GET TIME — machine syncs its RTC to server wall clock (IST).
  const lines = [
    "GET STAMP:0",
    "GET OPTION ALL",
    `GET TIME:${formatIclockTime(new Date())}`,
  ];
  return lines.join("\r\n") + "\r\n";
}

/**
 * Formats a Date as the iClock protocol timestamp string.
 * Expected format by ZKTeco firmware: "YYYY-MM-DD HH:mm:ss"
 * Timezone: Asia/Kolkata (IST) — the device is at Talwalkar Gym, India.
 */
function formatIclockTime(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", ""); // "en-CA" produces "YYYY-MM-DD, HH:mm:ss" — strip the comma
}

/**
 * Returns true when the incoming request is the iClock firmware's initial
 * handshake poll rather than an actual attendance data upload.
 *
 * Detection criteria (all of which must be true):
 *  1. HTTP method is GET (POST requests always carry attendance payloads).
 *  2. The query string contains "options=all" — this is the distinctive
 *     marker sent by ZKTeco/ESSL firmware during its polling handshake.
 *     Attendance uploads never include this parameter.
 */
function isIclockHandshake(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  return request.nextUrl.searchParams.get("options") === "all";
}

async function handle(request: NextRequest) {
  // ── GET handshake: return the iClock protocol response ──────────────────
  if (isIclockHandshake(request)) {
    console.info(
      JSON.stringify({
        domain: "biometric",
        event: "ICLOCK_HANDSHAKE",
        at: new Date().toISOString(),
        sn: request.nextUrl.searchParams.get("SN"),
        pushver: request.nextUrl.searchParams.get("pushver"),
        deviceType: request.nextUrl.searchParams.get("DeviceType"),
      }),
    );
    return new NextResponse(buildIclockHandshakeResponse(), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // ── POST (and all other methods): full attendance processing pipeline ────
  // This path is completely unchanged — processBiometricPayload() handles
  // ATTLOG body parsing, device resolution, duplicate detection, member
  // matching, attendance upsert, and sync log insertion exactly as before.
  const { metadata, payload } = await buildBiometricRequestMetadata(request);
  const outcome = await processBiometricPayload({ payload, metadata });
  return new NextResponse(outcome.protocolResponse.body, {
    status: outcome.protocolResponse.status,
    headers: outcome.protocolResponse.headers,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
