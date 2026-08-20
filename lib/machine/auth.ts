import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const MACHINE_SESSION_COOKIE = "syncfyre_machine_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type MachineSession = {
  machineId: string;
  branchId: string;
  exp: number;
};

function secret() {
  const value = process.env.MACHINE_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("MACHINE_SESSION_SECRET must be configured with at least 32 characters");
  }
  return value;
}

function encode(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signingKey() {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createMachineSession(machineId: string, branchId: string) {
  const payload: MachineSession = { machineId, branchId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${encode(new Uint8Array(signature))}`;
}

export async function verifyMachineSession(token: string | undefined): Promise<MachineSession | null> {
  if (!token) return null;
  const [encodedPayload, encodedSignature, ...rest] = token.split(".");
  if (!encodedPayload || !encodedSignature || rest.length) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await signingKey(), decode(encodedSignature), new TextEncoder().encode(encodedPayload));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decode(encodedPayload))) as MachineSession;
    return payload.machineId && payload.branchId && Number.isFinite(payload.exp) && payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export async function getMachineSessionFromRequest(request: NextRequest) {
  return verifyMachineSession(request.cookies.get(MACHINE_SESSION_COOKIE)?.value);
}

export async function getMachineSession() {
  return verifyMachineSession((await cookies()).get(MACHINE_SESSION_COOKIE)?.value);
}

export function setMachineSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(MACHINE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearMachineSessionCookie(response: NextResponse) {
  response.cookies.set(MACHINE_SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
}

export async function hashMachineSecret(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return encode(new Uint8Array(digest));
}

export function newMachineSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `smk_${encode(bytes)}`;
}
