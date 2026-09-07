import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAttendanceExceptions } from "@/services/attendance.service";
import { createClient } from "@/lib/supabase/server";
import { ManualCorrectionForm } from "@/components/attendance/manual-correction-form";

export const metadata = { title: "Unmatched Attendance" };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN");
}

export default async function AdminAttendanceUnmatchedPage() {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const [exceptionsResult, membersResult] = await Promise.all([
    listAttendanceExceptions({ branchId: profile.branch_id, resolutionStatus: "open", pageSize: 50 }),
    (async () => {
      const supabase = await createClient();
      let query = supabase.from("members").select("id,full_name,member_code").eq("status", "active").order("full_name").limit(500);
      if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    })(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <Link href="/admin/attendance" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="size-4" />
            Attendance
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Unmatched Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Review biometric events that need manual correction or member assignment.
          </p>
        </div>
        <Badge variant="warning" className="sm:ml-auto">
          {exceptionsResult.total} open issue{exceptionsResult.total === 1 ? "" : "s"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-600" />
            Open attendance exceptions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exceptionsResult.data.length ? exceptionsResult.data.map((row) => (
            <div key={row.id} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{row.machine_user_id}</p>
                    <Badge variant={row.status === "unmatched" ? "warning" : "outline"}>{row.status}</Badge>
                    <Badge variant={row.resolution_status === "open" ? "warning" : "success"}>{row.resolution_status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.machine?.machine_name ?? row.device_id} | {row.event_type} | {formatDateTime(row.event_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.exception_type ?? "no exception type"}{row.error_message ? ` | ${row.error_message}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <ManualCorrectionForm
                  exceptionId={row.id}
                  memberOptions={(membersResult as { id: string; full_name: string; member_code: string }[]).map((member) => ({
                    id: member.id,
                    full_name: member.full_name,
                    member_code: member.member_code,
                  }))}
                  defaultNotes={row.resolution_notes ?? ""}
                />
              </div>
            </div>
          )) : (
            <div className="grid min-h-52 place-items-center text-center">
              <div>
                <ShieldAlert className="mx-auto mb-3 size-10 text-muted-foreground" />
                <p className="font-medium">No unmatched attendance events</p>
                <p className="text-sm text-muted-foreground">All biometric events are currently resolved.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

