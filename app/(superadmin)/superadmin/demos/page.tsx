import Link from "next/link";
import { Building2, Calendar, Mail, MapPin, Phone, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Demo Bookings" };

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

export default async function DemosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireUser(["super_admin"]);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const pageSize = 25;
  const { data, count, error } = await createAdminClient()
    .from("demo_bookings")
    .select("id, contact_name, email, phone, gym_name, business_type, city, location_count, member_count, current_software, migration_urgency, preferred_date, preferred_time, notes, source, submitted_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  const demos = (data ?? []) as DemoBooking[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Demo Bookings</h1>
        <p className="text-sm text-muted-foreground">Gym owners who requested a demo — {total} total</p>
      </div>
      <Card>
        {error ? (
          <CardContent className="p-6 text-sm text-red-600">Error loading demo bookings: {error.message}</CardContent>
        ) : demos.length === 0 ? (
          <CardContent className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <Calendar className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No demo requests yet</p>
            </div>
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Gym / Business</th>
                    <th className="px-4 py-3 font-medium">Email &amp; Phone</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Branches</th>
                    <th className="px-4 py-3 font-medium">Members</th>
                    <th className="px-4 py-3 font-medium">Current Software</th>
                    <th className="px-4 py-3 font-medium">Urgency</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {demos.map((demo) => (
                    <tr key={demo.id} className="align-top transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{demo.contact_name ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-start gap-1.5">
                          <Building2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <span>
                            <span className="font-medium">{demo.gym_name ?? "—"}</span>
                            {demo.business_type ? (
                              <span className="block text-xs text-muted-foreground">{demo.business_type}</span>
                            ) : null}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {demo.email ? (
                          <a href={`mailto:${demo.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                            <Mail className="size-3.5 shrink-0" />
                            <span className="text-xs">{demo.email}</span>
                          </a>
                        ) : null}
                        {demo.phone ? (
                          <a href={`tel:${demo.phone}`} className="mt-0.5 flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                            <Phone className="size-3.5 shrink-0" />
                            <span className="text-xs">{demo.phone}</span>
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="text-xs">{demo.city ?? "—"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {demo.location_count ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5 shrink-0" />
                          {demo.member_count ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {demo.current_software ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {demo.migration_urgency ? (
                          <Badge variant="outline" className="text-[10px]">{demo.migration_urgency}</Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{demo.source ?? "—"}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(demo.submitted_at ?? demo.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-xs text-muted-foreground">
                        <p className="line-clamp-2">{demo.notes ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/superadmin/demos/${demo.id}`} className="text-xs font-medium text-primary hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">{total} bookings</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                {page > 1 && (
                  <Link href={`/superadmin/demos?page=${page - 1}`} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted">Prev</Link>
                )}
                {page < totalPages && (
                  <Link href={`/superadmin/demos?page=${page + 1}`} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted">Next</Link>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}