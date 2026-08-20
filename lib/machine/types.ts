export type MachineDeviceSummary = {
  id: string;
  machine_name: string;
  device_id: string;
  device_identifier: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  connection_mode: string | null;
  allowed_ip: string | null;
  branch_name: string | null;
  status: string;
  connection_status: string;
  last_seen_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  machine_api_url: string | null;
  todayEvents: number;
};

export type MachineMemberMapping = {
  id: string;
  full_name: string;
  member_code: string;
  machine_user_id: string | null;
  status: string;
};
