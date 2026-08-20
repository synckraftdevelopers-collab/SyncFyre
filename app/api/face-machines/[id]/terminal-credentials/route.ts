import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { newMachineSecret, hashMachineSecret } from "@/lib/machine/auth";
import { createClient } from "@/lib/supabase/server";

/** Rotates a terminal secret. The plaintext response is intentionally one-time only. */
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager"].includes(profile.role?.slug ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const supabase = await createClient();
  let machineQuery = supabase.from("face_machine_settings").select("id,device_id,branch_id,status").eq("id", id);
  if (profile.branch_id) machineQuery = machineQuery.eq("branch_id", profile.branch_id);
  const { data: machine } = await machineQuery.maybeSingle();
  if (!machine) return NextResponse.json({ error: "Machine not found." }, { status: 404 });
  if (machine.status !== "active") return NextResponse.json({ error: "Activate the machine before issuing terminal credentials." }, { status: 422 });

  const secret = newMachineSecret();
  const { error } = await supabase.from("face_machine_settings").update({ terminal_secret_hash: await hashMachineSecret(secret), terminal_secret_created_at: new Date().toISOString() }).eq("id", machine.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ machineId: machine.device_id, secret });
}
