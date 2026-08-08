import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateAppointmentStatusAction } from "@/app/actions/appointment-actions";

export const metadata = { title: "Appointments" };

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  approved: "success", pending: "warning", cancelled: "danger", completed: "outline",
};

export default async function AdminAppointmentsPage({ searchParams }: { searchParams: Promise<{ status?: string; from?: string; to?: string; past?: string; page?: string }> }) {
  const sp = await searchParams;
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase.from("appointments").select("*, members(full_name, member_code), staff!appointments_provider_staff_id_fkey(users!staff_user_id_fkey(full_name))").eq("branch_id", profile.branch_id).order("appointment_date").order("start_time");
  if (sp.status && sp.status !== "all") query = query.eq("status", sp.status);
  if (sp.from) query = query.gte("appointment_date", sp.from);
  else if (sp.past !== "1") query = query.gte("appointment_date", today);
  if (sp.to) query = query.lte("appointment_date", sp.to);
  const { data: appointments, error } = await query;
  if (error) throw new Error(error.message);

  const pageSize = 20;
  const page = Math.max(1, Number(sp.page ?? 1));
  const records = appointments ?? [];
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const rows = records.slice((page - 1) * pageSize, page * pageSize);
  const url = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) if (value && key !== "page") params.set(key, value);
    params.set("page", String(nextPage));
    return `/admin/appointments?${params}`;
  };

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Appointments</h1><p className="text-sm text-muted-foreground">Manage member appointments and their status.</p></div><Link href="/admin/appointments/new" className={buttonVariants({ className: "ml-auto" })}><Plus className="size-4" /> Book Appointment</Link></div>
    <Card><form className="flex flex-wrap gap-3 border-b p-4"><select name="status" defaultValue={sp.status ?? "all"} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><input name="from" type="date" defaultValue={sp.from} className="h-10 rounded-lg border bg-background px-3 text-sm" aria-label="From date" /><input name="to" type="date" defaultValue={sp.to} className="h-10 rounded-lg border bg-background px-3 text-sm" aria-label="To date" /><label className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm"><input type="checkbox" name="past" value="1" defaultChecked={sp.past === "1"} /> Include past</label><button type="submit" className={buttonVariants({ variant: "outline" })}>Apply</button></form>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr>{["Member", "Date", "Time", "Provider", "Type", "Status", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y">{rows.map((appointment) => { const member = appointment.members as unknown as { full_name: string | null; member_code: string | null } | null; const staff = appointment.staff as unknown as { users: { full_name: string | null } | null } | null; return <tr key={appointment.id} className="hover:bg-muted/30"><td className="px-4 py-3"><p className="font-medium">{member?.full_name ?? "—"}</p><p className="text-xs text-muted-foreground">{member?.member_code ?? ""}</p></td><td className="px-4 py-3 whitespace-nowrap">{appointment.appointment_date}</td><td className="px-4 py-3 whitespace-nowrap">{appointment.start_time} – {appointment.end_time}</td><td className="px-4 py-3">{staff?.users?.full_name ?? "—"}</td><td className="px-4 py-3 capitalize">{appointment.provider_type}</td><td className="px-4 py-3"><Badge variant={statusVariant[appointment.status] ?? "outline"}>{appointment.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2">{appointment.status === "pending" && <form action={updateAppointmentStatusAction.bind(null, appointment.id, "approved")}><button className={buttonVariants({ size: "sm" })}>Approve</button></form>}{appointment.status === "approved" && <><form action={updateAppointmentStatusAction.bind(null, appointment.id, "completed")}><button className={buttonVariants({ size: "sm" })}>Complete</button></form><form action={updateAppointmentStatusAction.bind(null, appointment.id, "cancelled")}><button className={buttonVariants({ variant: "outline", size: "sm" })}>Cancel</button></form></>}</div></td></tr>; })}</tbody></table></div> : <CardContent className="grid min-h-64 place-items-center text-center"><div><CalendarDays className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No appointments found</p><p className="text-sm text-muted-foreground">Book an appointment or adjust the filters.</p></div></CardContent>}
      <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground"><span>{records.length} appointment{records.length === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><span>Page {page} of {totalPages}</span><Link href={url(page - 1)} aria-disabled={page <= 1} className={buttonVariants({ variant: "outline", size: "icon" }) + (page <= 1 ? " pointer-events-none opacity-40" : "")}><ChevronLeft className="size-4" /></Link><Link href={url(page + 1)} aria-disabled={page >= totalPages} className={buttonVariants({ variant: "outline", size: "icon" }) + (page >= totalPages ? " pointer-events-none opacity-40" : "")}><ChevronRight className="size-4" /></Link></div></div>
    </Card>
  </div>;
}
