import { createAdminClient } from "@/lib/supabase/admin";
import { assignMachineUserIdToMember, generateMachineUserIdForMember, reprocessUnmatchedAttendanceForMember } from "@/services/biometric-mapping.service";

export type AttendanceQueryParams = {
  branchId?: string | null;
  status?: "mapped" | "unmapped" | "all";
  search?: string;
  from?: string;
  to?: string;
  deviceId?: string;
  limit?: number;
};

function istDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

async function getMachineNameMap(deviceIds: string[]) {
  const uniqueDeviceIds = [...new Set(deviceIds.filter(Boolean))];
  if (!uniqueDeviceIds.length) return new Map<string, string>();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("face_machine_settings")
    .select("device_id,machine_name")
    .in("device_id", uniqueDeviceIds);
  if (error) throw new Error(error.message);

  return new Map((data ?? []).map((row) => [row.device_id, row.machine_name]));
}

export async function listNormalizedAttendance(params: AttendanceQueryParams) {
  const supabase = createAdminClient();
  const search = params.search?.trim().toLowerCase() ?? "";
  const limit = params.limit ?? 200;

  let logsQuery = supabase
    .from("attendance_sync_logs")
    .select("id,attendance_id,member_id,machine_user_id,device_id,event_type,event_at,status,processing_result,resolution_status,exception_type")
    .order("event_at", { ascending: false })
    .limit(limit);
  if (params.branchId) logsQuery = logsQuery.eq("branch_id", params.branchId);
  if (params.from) logsQuery = logsQuery.gte("event_at", `${params.from}T00:00:00+05:30`);
  if (params.to) logsQuery = logsQuery.lte("event_at", `${params.to}T23:59:59+05:30`);
  if (params.deviceId) logsQuery = logsQuery.eq("device_id", params.deviceId);

  const [logsResult, mappingsResult] = await Promise.all([
    logsQuery,
    getBiometricMappings({ branchId: params.branchId, status: "verified", limit: 1000 }),
  ]);
  if (logsResult.error) throw new Error(logsResult.error.message);

  const rows = logsResult.data ?? [];
  const machineNameMap = await getMachineNameMap(rows.map((row) => row.device_id));

  const verifiedMappingsByMachineUserId = new Map(
    (mappingsResult as any[])
      .filter((row) => row.members && typeof row.machine_user_id === "string" && row.machine_user_id.trim())
      .map((row) => [String(row.machine_user_id).trim(), row.members])
  );

  const memberIds = [...new Set(rows.map((row) => row.member_id).filter(Boolean))] as string[];
  const memberMap = new Map<string, { id: string; full_name: string; member_code: string; status: string }>();

  if (memberIds.length) {
    const { data: membersData, error: membersError } = await supabase
      .from("members")
      .select("id,full_name,member_code,status")
      .in("id", memberIds);
    if (membersError) throw new Error(membersError.message);
    for (const member of membersData ?? []) {
      memberMap.set(member.id, member);
    }
  }

  const normalizedRows = rows.map((row: any) => {
    const machineUserId = typeof row.machine_user_id === "string" ? row.machine_user_id.trim() : "";
    const directMember = row.member_id ? memberMap.get(row.member_id) ?? null : null;
    const mappedMember = directMember ?? (machineUserId ? verifiedMappingsByMachineUserId.get(machineUserId) ?? null : null);
    const isMapped = Boolean(mappedMember);

    return {
      id: row.id,
      attendance_id: row.attendance_id,
      machine_user_id: machineUserId,
      member: mappedMember
        ? {
            id: mappedMember.id,
            full_name: mappedMember.full_name,
            member_code: mappedMember.member_code,
            status: mappedMember.status,
          }
        : null,
      device_id: row.device_id,
      machine_name: machineNameMap.get(row.device_id) ?? null,
      event_type: row.event_type,
      event_at: row.event_at,
      status: isMapped ? ("mapped" as const) : ("unmapped" as const),
      processing_result: row.processing_result,
      resolution_status: row.resolution_status,
      exception_type: row.exception_type,
    };
  });

  const filteredRows = normalizedRows.filter((row) => {
    if (params.status === "mapped") return row.status === "mapped";
    if (params.status === "unmapped") return row.status === "unmapped";
    return true;
  });

  return filteredRows
    .filter((row) => {
      if (!search) return true;
      return [row.member?.full_name ?? "", row.member?.member_code ?? "", row.machine_user_id ?? "", row.device_id ?? ""]
        .some((value) => String(value).toLowerCase().includes(search));
    })
    .sort((a, b) => b.event_at.localeCompare(a.event_at));
}
export async function getAttendanceSummary(branchId?: string | null) {
  const today = istDate();
  const [mapped, unmapped, pendingMappings] = await Promise.all([
    listNormalizedAttendance({ branchId, status: "mapped", from: today, to: today, limit: 1000 }),
    listNormalizedAttendance({ branchId, status: "unmapped", from: today, to: today, limit: 1000 }),
    getBiometricMappings({ branchId, status: "pending", limit: 1000 }),
  ]);

  return {
    today_total: mapped.length + unmapped.length,
    mapped_attendance: mapped.length,
    unmapped_attendance: unmapped.length,
    pending_biometric_mappings: pendingMappings.length,
  };
}

export async function getBiometricMappings(params: { branchId?: string | null; status?: "verified" | "pending" | "all"; limit?: number; search?: string; }) {
  const supabase = createAdminClient();
  let query = supabase
    .from("biometric_member_mapping")
    .select("id,member_id,machine_user_id,machine_name,match_status,verified,created_at,members!inner(id,full_name,member_code,machine_user_id,branch_id,status)")
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 500);
  if (params.branchId) query = query.eq("members.branch_id", params.branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const search = params.search?.trim().toLowerCase() ?? "";
  return (data ?? [])
    .map((row: any) => ({
      ...row,
      members: Array.isArray(row.members) ? row.members[0] ?? null : row.members ?? null,
    }))
    .filter((row: any) => {
      const machineUserId = typeof row.machine_user_id === "string" ? row.machine_user_id.trim() : "";
      if (params.status === "verified" && (!row.verified || !machineUserId)) return false;
      if (params.status === "pending" && row.verified && row.match_status !== "pending" && row.match_status !== "pending_registration") return false;
      if (!search) return true;
      return [row.members?.full_name ?? "", row.members?.member_code ?? "", machineUserId, row.machine_name ?? ""]
        .some((value) => String(value).toLowerCase().includes(search));
    });
}

export async function getMappedMembers(branchId?: string | null, search?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("members")
    .select("id,full_name,member_code,branch_id,status,machine_user_id,created_at")
    .not("machine_user_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const normalizedSearch = search?.trim().toLowerCase() ?? "";
  return (data ?? []).filter((member: any) => {
    const machineUserId = typeof member.machine_user_id === "string" ? member.machine_user_id.trim() : "";
    if (!machineUserId) return false;
    if (!normalizedSearch) return true;
    return [member.full_name, member.member_code, machineUserId].some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });
}

export async function getUnmappedMembers(branchId?: string | null, search?: string) {
  const supabase = createAdminClient();
  let membersQuery = supabase.from("members").select("id,full_name,member_code,branch_id,status,machine_user_id").order("created_at", { ascending: false }).limit(500);
  if (branchId) membersQuery = membersQuery.eq("branch_id", branchId);
  const [membersResult, mappings] = await Promise.all([
    membersQuery,
    getBiometricMappings({ branchId, status: "all", limit: 1000 }),
  ]);
  if (membersResult.error) throw new Error(membersResult.error.message);
  const members = membersResult.data ?? [];
  const validMemberIds = new Set((mappings as any[]).filter((row) => row.verified && row.machine_user_id).map((row) => row.member_id));
  const normalizedSearch = search?.trim().toLowerCase() ?? "";
  return members.filter((member: any) => {
    const mapped = validMemberIds.has(member.id);
    if (mapped) return false;
    if (!normalizedSearch) return true;
    return [member.full_name, member.member_code, member.machine_user_id ?? ""].some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });
}

export async function getUnidentifiedMachineUsers(branchId?: string | null, from?: string, to?: string) {
  const rows = await listNormalizedAttendance({ branchId, status: "unmapped", from, to, limit: 1000 });
  const grouped = new Map<string, { machine_user_id: string; device_id: string; machine_name: string | null; first_seen: string; last_seen: string; attendance_events: number }>();
  for (const row of rows) {
    const key = `${row.machine_user_id}::${row.device_id}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        machine_user_id: row.machine_user_id,
        device_id: row.device_id,
        machine_name: row.machine_name,
        first_seen: row.event_at,
        last_seen: row.event_at,
        attendance_events: 1,
      });
    } else {
      current.first_seen = current.first_seen < row.event_at ? current.first_seen : row.event_at;
      current.last_seen = current.last_seen > row.event_at ? current.last_seen : row.event_at;
      current.attendance_events += 1;
    }
  }
  return Array.from(grouped.values()).sort((a, b) => b.last_seen.localeCompare(a.last_seen));
}

export async function verifyBiometricRegistration(mappingId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("biometric_member_mapping")
    .update({ verified: true, match_status: "verified" })
    .eq("id", mappingId)
    .select("id,member_id,machine_user_id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBiometricMapping(mappingId: string, unassign = false) {
  const supabase = createAdminClient();
  const { data: mapping, error: mappingError } = await supabase
    .from("biometric_member_mapping")
    .select("id,member_id,machine_user_id")
    .eq("id", mappingId)
    .single();
  if (mappingError) throw new Error(mappingError.message);

  if (unassign) {
    const { error: memberError } = await supabase
      .from("members")
      .update({ machine_user_id: null })
      .eq("id", mapping.member_id);
    if (memberError) throw new Error(memberError.message);
  }

  const { error } = await supabase.from("biometric_member_mapping").delete().eq("id", mappingId);
  if (error) throw new Error(error.message);
  return mapping;
}

export async function deleteAttendanceEvent(syncLogId: string) {
  const supabase = createAdminClient();
  const { data: log, error: logError } = await supabase
    .from("attendance_sync_logs")
    .select("id,attendance_id")
    .eq("id", syncLogId)
    .single();
  if (logError) throw new Error(logError.message);

  const { error: deleteLogError } = await supabase.from("attendance_sync_logs").delete().eq("id", syncLogId);
  if (deleteLogError) throw new Error(deleteLogError.message);

  if (log.attendance_id) {
    const { count, error: countError } = await supabase
      .from("attendance_sync_logs")
      .select("id", { count: "exact", head: true })
      .eq("attendance_id", log.attendance_id);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) === 0) {
      const { error: attendanceError } = await supabase.from("attendance").delete().eq("id", log.attendance_id);
      if (attendanceError) throw new Error(attendanceError.message);
    }
  }

  return { id: syncLogId };
}

export async function createOrUpdateBiometricMapping(input: {
  memberId: string;
  machineUserId: string;
  machineName?: string | null;
  verified?: boolean;
  matchStatus?: string;
  reprocess?: boolean;
  performedBy: string;
}) {
  const mapping = await assignMachineUserIdToMember({
    memberId: input.memberId,
    machineUserId: input.machineUserId,
    machineName: input.machineName,
    verified: input.verified ?? true,
    matchStatus: (input.matchStatus as any) ?? "matched",
  });

  let reprocessed = 0;
  if (input.reprocess) {
    const result = await reprocessUnmatchedAttendanceForMember({
      memberId: input.memberId,
      machineUserId: input.machineUserId,
      performedBy: input.performedBy,
      notes: "Reprocessed after manual biometric mapping.",
    });
    reprocessed = result.reprocessed;
  }

  return { mapping, reprocessed };
}

export async function generateMachineIdForMember(memberId: string) {
  return generateMachineUserIdForMember({
    memberId,
    matchStatus: "pending_registration",
    verified: false,
  });
}
