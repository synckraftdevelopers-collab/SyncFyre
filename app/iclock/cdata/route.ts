import { NextRequest, NextResponse } from "next/server";
import { buildBiometricRequestMetadata } from "@/lib/biometric/http";
import { processBiometricPayload } from "@/services/biometric.service";

async function handle(request: NextRequest) {
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