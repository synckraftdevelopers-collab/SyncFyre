import { createAdminClient } from "@/lib/supabase/admin";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type BiometricMappingStatus =
  | "pending_registration"
  | "verified"
  | "manual_mapping"
  | "unidentified_resolved";

export type BiometricMappingRow = {
  id: string;
  member_id: string;
  machine_user_id: string;
  machine_name: string | null;
  match_status: string;
  verified: boolean;
  created_at: string;
  members: {
    id: string;
    full_name: string;
    member_code: string;
    machine_user_id: string | null;
    status: string;
    branch_id: string;
  } | null;
};

export async function assignMachineUserIdToMember(input: {
  memberId: string;
  machineUserId: string;
  machineName?: string | null;
  matchStatus?: BiometricMappingStatus;
  verified?: boolean;
  allowReassign?: boolean;
}) {
  const supabase = createAdminClient();
  const machineUserId = input.machineUserId.trim();
  if (!machineUserId) {
    throw new Error("Machine User ID is required.");
  }

  const { data, error } = await supabase.rpc("assign_biometric_mapping", {
    p_member_id: input.memberId,
    p_machine_user_id: machineUserId,
    p_machine_name: input.machineName ?? null,
    p_match_status: input.matchStatus ?? "manual_mapping",
    p_verified: input.verified ?? true,
    p_allow_reassign: input.allowReassign ?? false,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function generateMachineUserIdForMember(input: {
  memberId: string;
  machineName?: string | null;
  matchStatus?: BiometricMappingStatus;
  verified?: boolean;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("generate_member_machine_user_id", {
    p_member_id: input.memberId,
    p_machine_name: input.machineName ?? null,
    p_match_status: input.matchStatus ?? "pending_registration",
    p_verified: input.verified ?? false,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getMemberByMachineUserId(machineUserId: string) {
  const supabase = createAdminClient();
  const cleaned = machineUserId.trim();
  if (!cleaned) return null;

  const { data, error } = await supabase
    .from("biometric_member_mapping")
    .select(`
      id,
      member_id,
      machine_user_id,
      machine_name,
      match_status,
      verified,
      created_at,
      members!inner(id,branch_id,member_code,machine_user_id,full_name,status)
    `)
    .eq("machine_user_id", cleaned)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as BiometricMappingRow | null;
}

export async function reprocessUnmatchedAttendanceForMember(input: {
  memberId: string;
  machineUserId: string;
  performedBy: string;
  notes?: string | null;
}) {
  const supabase = createAdminClient();
  const cleaned = input.machineUserId.trim();
  if (!cleaned) return { reprocessed: 0 };

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id,branch_id")
    .eq("id", input.memberId)
    .single();
  if (memberError || !member) throw new Error(memberError?.message ?? "Member not found.");

  const { data: unresolved, error: unresolvedError } = await supabase
    .from("attendance_sync_logs")
    .select("id,device_id,machine_user_id,event_type,event_at,raw_payload,verification_method")
    .eq("branch_id", member.branch_id)
    .eq("machine_user_id", cleaned)
    .eq("resolution_status", "open")
    .in("status", ["unmatched", "error", "rejected"])
    .order("event_at", { ascending: true });
  if (unresolvedError) throw new Error(unresolvedError.message);

  let reprocessed = 0;

  for (const log of unresolved ?? []) {
    const attendanceDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(log.event_at));

    const basePayload = {
      member_id: member.id,
      branch_id: member.branch_id,
      device_id: log.device_id,
      machine_user_id: cleaned,
      attendance_date: attendanceDate,
      source: "biometric",
      entry_time: log.event_type === "exit" ? null : log.event_at,
      exit_time: log.event_type === "exit" ? log.event_at : null,
    };

    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .upsert(basePayload, { onConflict: "member_id,attendance_date" })
      .select("id,entry_time,exit_time")
      .single();
    if (attendanceError) throw new Error(attendanceError.message);

    const patch =
      log.event_type === "exit"
        ? {
            exit_time: attendance.exit_time
              ? new Date(Math.max(new Date(attendance.exit_time).getTime(), new Date(log.event_at).getTime())).toISOString()
              : log.event_at,
          }
        : {
            entry_time: attendance.entry_time
              ? new Date(Math.min(new Date(attendance.entry_time).getTime(), new Date(log.event_at).getTime())).toISOString()
              : log.event_at,
          };

    const { data: updatedAttendance, error: updateAttendanceError } = await supabase
      .from("attendance")
      .update(patch)
      .eq("id", attendance.id)
      .select("id")
      .single();
    if (updateAttendanceError) throw new Error(updateAttendanceError.message);

    const metadata: Record<string, Json> = {
      reprocessed: true,
      reprocessed_by: input.performedBy,
      reprocessed_at: new Date().toISOString(),
    };

    const { error: updateLogError } = await supabase
      .from("attendance_sync_logs")
      .update({
        member_id: member.id,
        attendance_id: updatedAttendance.id,
        status: "processed",
        processing_result: "SUCCESS",
        resolution_status: "resolved",
        resolution_action: "assign_member",
        resolved_by: input.performedBy,
        resolved_at: new Date().toISOString(),
        resolution_notes: input.notes ?? "Resolved after biometric member mapping.",
        resolution_metadata: metadata,
        exception_type: null,
      })
      .eq("id", log.id);
    if (updateLogError) throw new Error(updateLogError.message);

    reprocessed += 1;
  }

  return { reprocessed };
}
