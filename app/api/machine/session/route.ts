import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMachineSession, hashMachineSecret, setMachineSessionCookie } from "@/lib/machine/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { machineId?: unknown; secret?: unknown } | null;
  const machineId = typeof body?.machineId === "string" ? body.machineId.trim() : "";
  const providedSecret = typeof body?.secret === "string" ? body.secret.trim() : "";
  if (!machineId || !providedSecret) return NextResponse.json({ error: "Machine ID and device secret are required." }, { status: 422 });

  const admin = createAdminClient();
  const { data: machine } = await admin
    .from("face_machine_settings")
    .select("id,branch_id,status,terminal_secret_hash")
    .eq("device_id", machineId)
    .maybeSingle();
  const actualHash = machine?.terminal_secret_hash;
  const providedHash = await hashMachineSecret(providedSecret);
  if (!machine || machine.status !== "active" || !actualHash || !timingSafeEqual(actualHash, providedHash)) {
    return NextResponse.json({ error: "Invalid or inactive machine credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setMachineSessionCookie(response, await createMachineSession(machine.id, machine.branch_id));
  return response;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}
