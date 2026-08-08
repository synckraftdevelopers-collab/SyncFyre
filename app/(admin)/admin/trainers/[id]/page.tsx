import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Trainer Profile" };
const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = { approved: "success", pending: "warning", cancelled: "danger", completed: "outline" };
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—"; }

export default async function AdminTrainerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireUser(["admin", "manager"]);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: trainer }, { data: members }, { data: appointments }] = await Promise.all([
    supabase.from("trainers").select("*, users(full_name, email, phone)").eq("id", id).eq("branch_id", profile.branch_id).maybeSingle(),
    supabase.from("members").select("id, full_name, member_code, status").eq("assigned_trainer_id", id).order("full_name"),
    supabase.from("appointments").select("*, members(full_name)").eq("provider_staff_id", id).gte("appointment_date", today).order("appointment_date").order("start_time"),
  ]);
  if (!trainer) notFound();
  const user = trainer.users as unknown as { full_name: string | null; email: string | null; phone: string | null } | null;
  const specializations = trainer.specializations ?? [];
  const certifications = trainer.certifications ?? [];
  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-center gap-2"><Link href="/admin/trainers" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft className="size-4" /> Trainers</Link><Link href="/admin/trainers/new" className={buttonVariants({ variant: "outline", size: "sm" })}>Edit trainer</Link></div>
    <Card><CardContent className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7"><div><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">{(user?.full_name ?? "T").slice(0, 1).toUpperCase()}</div><div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{user?.full_name ?? "Trainer"}</h1><Badge variant={trainer.status === "active" ? "success" : "outline"}>{trainer.status}</Badge></div><p className="text-sm text-muted-foreground">{user?.email ?? "No email address"}</p></div></div><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><Detail label="Phone" value={user?.phone} /><Detail label="Experience" value={`${trainer.experience_years ?? 0} years`} /><Detail label="Employee code" value={trainer.employee_code} /><Detail label="Joined" value={formatDate(trainer.joining_date)} /></dl>{trainer.bio && <p className="mt-5 text-sm leading-6 text-muted-foreground">{trainer.bio}</p>}</div><div className="grid grid-cols-2 gap-3 md:w-56"><Metric value={members?.length ?? 0} label="Assigned members" /><Metric value={appointments?.length ?? 0} label="Upcoming sessions" /></div></CardContent></Card>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Qualifications</CardTitle></CardHeader><CardContent className="space-y-5"><TagSection label="Specializations" values={specializations} /><TagSection label="Certifications" values={certifications} /></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><UsersRound className="size-5" /> Assigned members</CardTitle></CardHeader><CardContent>{members?.length ? <div className="divide-y">{members.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><Link className="font-medium hover:underline" href={`/admin/members/${member.id}`}>{member.full_name}</Link><p className="text-xs text-muted-foreground">{member.member_code}</p></div><Badge variant={member.status === "active" ? "success" : "outline"}>{member.status}</Badge></div>)}</div> : <Empty text="No members assigned yet." />}</CardContent></Card></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5" /> Upcoming appointments</CardTitle></CardHeader><CardContent>{appointments?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr>{["Member", "Date", "Time", "Purpose", "Status"].map((heading) => <th key={heading} className="pb-2 pr-4 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y">{appointments.map((appointment) => { const member = appointment.members as unknown as { full_name: string | null } | null; return <tr key={appointment.id}><td className="py-3 pr-4 font-medium">{member?.full_name ?? "—"}</td><td className="py-3 pr-4">{formatDate(appointment.appointment_date)}</td><td className="py-3 pr-4">{appointment.start_time} – {appointment.end_time}</td><td className="py-3 pr-4 text-muted-foreground">{appointment.purpose ?? "—"}</td><td className="py-3 pr-4"><Badge variant={statusVariant[appointment.status] ?? "outline"}>{appointment.status}</Badge></td></tr>; })}</tbody></table></div> : <Empty text="No upcoming appointments." />}</CardContent></Card>
  </div>;
}
function Detail({ label, value }: { label: string; value: string | null | undefined }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 font-medium">{value || "—"}</dd></div>; }
function Metric({ value, label }: { value: number; label: string }) { return <div className="rounded-xl border p-3 text-center"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
function TagSection({ label, values }: { label: string; values: string[] }) { return <div><p className="mb-2 text-sm font-medium">{label}</p>{values.length ? <div className="flex flex-wrap gap-2">{values.map((value) => <Badge key={value} variant="outline">{value}</Badge>)}</div> : <p className="text-sm text-muted-foreground">Not provided</p>}</div>; }
function Empty({ text }: { text: string }) { return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>; }
