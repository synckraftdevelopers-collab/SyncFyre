import { NextRequest, NextResponse } from "next/server";
import { buildBiometricRequestMetadata } from "@/lib/biometric/http";
import { processBiometricPayload } from "@/services/biometric.service";

export async function POST(request: NextRequest) {
  const { metadata, payload } = await buildBiometricRequestMetadata(request);
  const outcome = await processBiometricPayload({ payload, metadata });
  const failed = outcome.results.filter((result) => result.status === "PROCESSING_ERROR").length;

  return NextResponse.json(
    {
      requestId: outcome.requestId,
      deviceId: outcome.device?.device_id ?? null,
      results: outcome.results,
    },
    { status: failed === outcome.results.length ? 422 : 200 },
  );
}