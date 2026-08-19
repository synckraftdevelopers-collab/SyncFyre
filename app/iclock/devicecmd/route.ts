import { NextRequest, NextResponse } from "next/server";
import { buildBiometricRequestMetadata } from "@/lib/biometric/http";
import { processBiometricPayload } from "@/services/biometric.service";

async function handle(request: NextRequest) {
  const { metadata, payload } = await buildBiometricRequestMetadata(request);
  await processBiometricPayload({ payload, metadata });
  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}