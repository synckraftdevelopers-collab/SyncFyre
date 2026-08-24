import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Calendar, Mail, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Demo Booking Details" };
type DemoBooking = { id: string; contact_name: string | null; email: string | null; phone: string | null; gym_name: string | null; city: string | null; notes: string | null; source: string | null; created_at: string };

export default async function DemoBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["super_admin"]);
  const { id } = await params;
  const { data, error } = await createAdminClient().from("demo_bookings").select("id, contact_name, email, phone, gym_name, city, notes, source, created_at").eq("id", id).maybeSingle();
  if (error || !data) notFound();
  const demo = data as DemoBooking;
  return <div className="mx-auto max-w-2xl space-y-5"><div><Link href="/superadmin/demos" className="text-sm font-medium text-primary hover:underline">Back to demo bookings</Link><h1 className="mt-3 text-2xl font-bold">{demo.gym_name ?? "Demo booking"}</h1><p className="mt-1 text-sm text-muted-foreground">Submitted {new Date(demo.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div><Card><CardHeader><CardTitle>Booking details</CardTitle></CardHeader><CardContent className="grid gap-5 text-sm sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</p><p className="mt-1 font-medium">{demo.contact_name ?? "—"}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</p><Badge className="mt-1" variant="outline">{demo.source ?? "—"}</Badge></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>{demo.email ? <a className="mt-1 flex items-center gap-2 font-medium text-primary hover:underline" href={`mailto:${demo.email}`}><Mail className="size-4" />{demo.email}</a> : <p className="mt-1">—</p>}</div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>{demo.phone ? <a className="mt-1 flex items-center gap-2 font-medium text-primary hover:underline" href={`tel:${demo.phone}`}><Phone className="size-4" />{demo.phone}</a> : <p className="mt-1">—</p>}</div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Business</p><p className="mt-1 flex items-center gap-2 font-medium"><Building2 className="size-4" />{demo.gym_name ?? "—"}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">City</p><p className="mt-1">{demo.city ?? "—"}</p></div><div className="sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Requirements</p><p className="mt-1 whitespace-pre-wrap leading-6">{demo.notes ?? "No message supplied."}</p></div></CardContent></Card><p className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="size-4" />Status changes are unavailable because the current demo_bookings schema has no status column.</p></div>;
}