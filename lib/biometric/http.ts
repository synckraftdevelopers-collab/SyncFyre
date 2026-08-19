import { NextRequest } from "next/server";
import type { BiometricRequestMetadata } from "@/lib/biometric/types";

export function extractIpAddress(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export function sanitizeHeaders(request: NextRequest) {
  const headers: Record<string, string> = {};
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      [
        "content-type",
        "user-agent",
        "authorization",
        "x-device-id",
        "x-device-identifier",
        "x-device-serial",
        "x-sync-secret",
        "x-api-key",
        "x-biometric-token",
      ].includes(lower) ||
      lower.startsWith("x-zk")
    ) {
      headers[lower] =
        lower.includes("secret") ||
        lower.includes("token") ||
        lower.includes("authorization") ||
        lower === "x-api-key"
          ? "[redacted]"
          : value;
    }
  }
  return headers;
}

export async function readBiometricRequestPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const rawBody = await request.text();
  if (!rawBody.trim()) return { rawBody, payload: {} as unknown };

  if (contentType.includes("application/json")) {
    try {
      return { rawBody, payload: JSON.parse(rawBody) as unknown };
    } catch {
      return { rawBody, payload: { raw: rawBody } };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    return { rawBody, payload: Object.fromEntries(params.entries()) };
  }

  return { rawBody, payload: { raw: rawBody } };
}

export async function buildBiometricRequestMetadata(
  request: NextRequest,
): Promise<{ metadata: BiometricRequestMetadata; payload: unknown }> {
  const { rawBody, payload } = await readBiometricRequestPayload(request);
  return {
    payload,
    metadata: {
      provider: "essl",
      receivedAt: new Date(),
      contentType: request.headers.get("content-type"),
      method: request.method,
      path: request.nextUrl.pathname,
      url: request.url,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
      ipAddress: extractIpAddress(request),
      headers: sanitizeHeaders(request),
      rawBody,
    },
  };
}