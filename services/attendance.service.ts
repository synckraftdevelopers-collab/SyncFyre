import { createClient } from "@/lib/supabase/server";
import {
  getAttendanceSummary as getBiometricAttendanceSummary,
  getBiometricMappings as getBiometricMappingsInternal,
  getMappedMembers as getMappedMembersInternal,
  getUnidentifiedMachineUsers as getUnidentifiedMachineUsersInternal,
  getUnmappedMembers as getUnmappedMembersInternal,
  listNormalizedAttendance as listNormalizedAttendanceInternal,
} from "@/services/biometric-admin.service";
import { resolveAttendanceException } from "@/services/workflow.service";
import { getMachineManagementData } from "@/services/machine-management.service";

export type AttendanceExceptionRow = {
  id: string;
  branch_id: string | null;
  device_id: string;
  machine_user_id: string;
  event_type: string;
  event_at: string;
  status: string;
  error_message: string | null;
  exception_type: string | null;
  resolution_status: string;
  resolution_action: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  attendance_id: string | null;
  machine: { machine_name: string | null } | null;
};

export type AttendanceExceptionFilters = {
  branchId?: string | null;
  resolutionStatus?: "open" | "resolved" | "ignored" | "all";
  exceptionType?: string | null;
  page?: number;
  pageSize?: number;
};

export async function listAttendanceExceptions(filters: AttendanceExceptionFilters = {}) {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  let query = supabase
    .from("attendance_sync_logs")
    .select(
      "id,branch_id,device_id,machine_user_id,event_type,event_at,status,error_message,exception_type,resolution_status,resolution_action,resolved_at,resolution_notes,attendance_id,machine:face_machine_settings(machine_name)",
      { count: "exact" },
    )
    .or("status.in.(duplicate,unmatched,error,rejected),exception_type.not.is.null");

  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.resolutionStatus && filters.resolutionStatus !== "all") query = query.eq("resolution_status", filters.resolutionStatus);
  if (filters.exceptionType && filters.exceptionType !== "all") query = query.eq("exception_type", filters.exceptionType);

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.order("event_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map((row) => {
      const raw = row as any;
      return {
        ...raw,
        machine: firstRelation(raw.machine),
      };
    }) as AttendanceExceptionRow[],
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getAttendanceDevices(branchId?: string | null) {
  const { devices } = await getMachineManagementData(branchId ?? null);
  return devices;
}

export async function getAttendanceDashboard(branchId?: string | null) {
  return {
    summary: await getBiometricAttendanceSummary(branchId),
    exceptions: await listAttendanceExceptions({ branchId, pageSize: 5 }),
    devices: await getAttendanceDevices(branchId),
  };
}

export {
  getBiometricAttendanceSummary as getAttendanceSummary,
  getBiometricMappingsInternal as getBiometricMappings,
  getMappedMembersInternal as getMappedMembers,
  listNormalizedAttendanceInternal as listNormalizedAttendance,
  getUnidentifiedMachineUsersInternal as getUnidentifiedMachineUsers,
  getUnmappedMembersInternal as getUnmappedMembers,
  resolveAttendanceException,
};
