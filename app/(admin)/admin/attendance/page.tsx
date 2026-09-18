import { AttendanceManagementClient } from "@/components/attendance/attendance-management-client";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Attendance" };

export default async function AdminAttendancePage() {
  await requireUser(["owner", "admin", "manager", "reception"]);
  return <AttendanceManagementClient />;
}
