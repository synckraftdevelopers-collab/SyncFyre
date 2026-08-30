import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrUpdateBiometricMapping, getBiometricMappings, getUnifiedMappedMembers, getUnidentifiedMachineUsers } from "@/services/biometric-admin.service";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams;
  const status = (q.get("status") ?? "all") as "verified" | "pending" | "all";
  const search = q.get("search") ?? "";
  const from = q.get("from") ?? undefined;
  const to = q.get("to") ?? undefined;
  const includeUnidentified = q.get("includeUnidentified") === "true";
  const includeDevices = q.get("includeDevices") === "true";

  try {
    const [mappings, mappedMembers, unidentified, devicesResult] = await Promise.all([
      getBiometricMappings({ branchId: profile.branch_id, status, search }),
      getUnifiedMappedMembers(profile.branch_id, search),
      includeUnidentified ? getUnidentifiedMachineUsers(profile.branch_id, from, to) : Promise.resolve([]),
      includeDevices ? (() => { let query = createAdminClient().from("face_machine_settings").select("device_id,machine_name").eq("status", "active").order("machine_name"); if (profile.branch_id) query = query.eq("branch_id", profile.branch_id); return query; })() : Promise.resolve({ data: [], error: null }),
    ]);
    if (devicesResult.error) throw new Error(devicesResult.error.message);
    return NextResponse.json({ data: mappings, mappedMembers, unidentified, devices: devicesResult.data ?? [] });
  } catch (error) {
    console.error("Biometric data request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load biometric mappings." }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    member_id?: string;
    machine_user_id?: string;
    machine_name?: string | null;
    verified?: boolean;
    match_status?: string;
    reprocess?: boolean;
  };

  if (!body.member_id || !body.machine_user_id) {
    return NextResponse.json({ error: "member_id and machine_user_id are required." }, { status: 422 });
  }

  try {
    return NextResponse.json(await createOrUpdateBiometricMapping({
      memberId: body.member_id,
      machineUserId: body.machine_user_id,
      machineName: body.machine_name ?? null,
      verified: body.verified ?? true,
      matchStatus: body.match_status ?? "matched",
      reprocess: body.reprocess ?? true,
      performedBy: profile.id,
    }));
  } catch (error) {
    console.error("Biometric data request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save biometric mapping." }, { status: 400 });
  }
}

