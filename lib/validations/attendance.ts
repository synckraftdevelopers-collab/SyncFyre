import { z } from "zod";

export const machineAttendanceSchema = z.object({
  device_id: z.string().min(1).max(100),
  machine_user_id: z.string().min(1).max(100),
  event_at: z.string().datetime({ offset: true }),
  event_type: z.enum(["entry", "exit"]),
  external_event_id: z.string().min(1).max(200),
});

export const attendanceBatchSchema = z.object({
  events: z.array(machineAttendanceSchema).min(1).max(1000),
});

export type MachineAttendanceEvent = z.infer<typeof machineAttendanceSchema>;
