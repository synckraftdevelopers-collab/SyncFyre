import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Calendar, Mail, MapPin, Phone, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Demo Booking Details" };

type DemoBooking = {
  id: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  gym_name: string | null;
  business_type: string | null;
  city: string | null;
  location_count: string | number | null;
  member_count: string | number | null;
  current_software: string | null;
  migration_urgency: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  source: string | null;
  submitted_at: string | null;
  created_at: string;
};

export default async function DemoBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["super_admin"]);
  const { id } = await params;

  const { data, error } = await createAdminClient()
    .from("demo_bookings")
    .select("id, contact_name, email, phone, gym_name, business_type, city, location_count, member_count, current_software, migration_urgency, preferred_date, preferred_time, notes, source, submitted_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const demo = data as DemoBooking;

  const submittedAt = demo.submitted_at ?? demo.created_at;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/superadmin/demos" className="text-sm font-medium text-primary hover:underline">
          ← Back to demo bookings
        </Link>
        <h1 className="mt-3 text-2xl font-bold">{demo.gym_name ?? "Demo booking"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submitted {new Date(submittedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</p>
            <p className="mt-1 font-medium">{demo.contact_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</p>
            <Badge className="mt-1" variant="outline">{demo.source ?? "—"}</Badge>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
            {demo.email ? (
              <a className="mt-1 flex items-center gap-2 font-medium text-primary hover:underline" href={`mailto:${demo.email}`}>
                <Mail className="size-4" />{demo.email}
              </a>
            ) : <p className="mt-1">—</p>}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
            {demo.phone ? (
              <a className="mt-1 flex items-center gap-2 font-medium text-primary hover:underline" href={`tel:${demo.phone}`}>
                <Phone className="size-4" />{demo.phone}
              </a>
            ) : <p className="mt-1">—</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gym / Business Name</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              <Building2 className="size-4" />{demo.gym_name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Business Type</p>
            <p className="mt-1">{demo.business_type ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">City</p>
            <p className="mt-1 flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />{demo.city ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Number of Locations</p>
            <p className="mt-1">{demo.location_count ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Member Count</p>
            <p className="mt-1 flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />{demo.member_count ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Software</p>
            <p className="mt-1">{demo.current_software ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Migration Urgency</p>
            <p className="mt-1">{demo.migration_urgency ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferred Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preferred Date</p>
            <p className="mt-1 flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              {demo.preferred_date ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preferred Time</p>
            <p className="mt-1">{demo.preferred_time ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {demo.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes / Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-6">{demo.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
