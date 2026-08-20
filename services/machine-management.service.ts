import { createClient } from "@/lib/supabase/server";
import type { MachineDeviceSummary, MachineMemberMapping } from "@/lib/machine/types";

/** Shared read model for the admin machine-management surfaces. */
export async function getMachineManagementData(branchId: string | null, memberSearch = "") {
  const supabase = await createClient();
  let mappingsQuery = supabase.from("members").select("id,full_name,member_code,machine_user_id,status").order("created_at", { ascending: false }).limit(20);
  if (branchId) mappingsQuery = mappingsQuery.eq("branch_id", branchId);
  if (memberSearch.trim()) {
    const search = memberSearch.trim().replace(/[%_,]/g, "");
    mappingsQuery = mappingsQuery.or(`full_name.ilike.%${search}%,member_code.ilike.%${search}%,machine_user_id.ilike.%${search}%`);
  }

  const [{ data: devices }, { data: syncLogs }, { data: mappings }] = await Promise.all([
    (() => { let query = supabase.from("face_machine_settings").select("id,machine_name,device_id,device_identifier,manufacturer,model,serial_number,connection_mode,allowed_ip,status,connection_status,last_seen_at,last_sync_at,last_error,machine_api_url,branches(name)").order("created_at", { ascending: false }); if (branchId) query = query.eq("branch_id", branchId); return query; })(),
    (() => { let query = supabase.from("attendance_sync_logs").select("device_id,event_received_at").gte("event_received_at", `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`); if (branchId) query = query.eq("branch_id", branchId); return query; })(),
    mappingsQuery,
  ]);
  const todayEvents = new Map<string, number>();
  for (const row of syncLogs ?? []) todayEvents.set(row.device_id, (todayEvents.get(row.device_id) ?? 0) + 1);
  const biometricDevices: MachineDeviceSummary[] = (devices ?? []).map((device) => ({
    id: device.id, machine_name: device.machine_name, device_id: device.device_id, device_identifier: device.device_identifier,
    manufacturer: device.manufacturer, model: device.model, serial_number: device.serial_number, connection_mode: device.connection_mode,
    allowed_ip: device.allowed_ip, branch_name: (device.branches as { name?: string } | null)?.name ?? null, status: device.status,
    connection_status: device.connection_status, last_seen_at: device.last_seen_at, last_sync_at: device.last_sync_at,
    last_error: device.last_error, machine_api_url: device.machine_api_url, todayEvents: todayEvents.get(device.device_id) ?? 0,
  }));
  return { devices: biometricDevices, mappings: (mappings ?? []) as MachineMemberMapping[] };
}

/** Terminal-safe device information. Configuration secrets are intentionally excluded. */
export async function getMachineTerminalDevices(branchId: string | null) {
  const { devices } = await getMachineManagementData(branchId);
  return devices.filter((device) => device.status === "active").map(({ id, machine_name, device_id, connection_status, last_seen_at }) => ({ id, machine_name, device_id, connection_status, last_seen_at }));
}
