import { Calendar, Phone, Mail, Building2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Demo Bookings" };

// ─── Adjust these column names to match your actual book_demo table ───────────
// Run this in SQL Editor to get exact column names:
// select column_name from information_schema.columns
// where table_name = 'book_demo' and table_schema = 'public'
// order by ordinal_position;

interface DemoBooking {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  gym_name?: string | null;
  business_name?: string | null;
  city?: string | null;
  message?: string | null;
  status?: string | null;
  created_at: string;
  [key: string]: unknown;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "outline" | "danger"> = {
  new:        "warning",
  contacted:  "success",
  scheduled:  "success",
  completed:  "outline",
  declined:   "danger",
};

export default async function DemosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireUser(["super_admin"]);
  const sp = await searchParams;
  const admin = createAdminClient();
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 25;

  let query = admin
    .from("book_demo")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (sp.status && sp.status !== "all") {
    query = query.eq("status", sp.status);
  }

  const { data, count, error } = await query;

  const demos = (data ?? []) as DemoBooking[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demo Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Gym owners who requested a demo — {total} total
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "new", "contacted", "scheduled", "completed", "declined"].map((s) => (
          <a
            key={s}
            href={`/superadmin/demos${s === "all" ? "" : `?status=${s}`}`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              (sp.status ?? "all") === s
                ? "bg-primary text-white border-primary"
                : "bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      <Card>
        {error ? (
          <CardContent className="p-6 text-sm text-red-600">
            Error loading demo bookings: {error.message}
            <p className="mt-2 text-muted-foreground text-xs">
              The book_demo table may not exist yet or column names may differ.
              Run: <code>select column_name from information_schema.columns where table_name = &apos;book_demo&apos;</code>
            </p>
          </CardContent>
        ) : demos.length === 0 ? (
          <CardContent className="grid min-h-56 place-items-center text-center p-8">
            <div>
              <Calendar className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No demo requests yet</p>
            </div>
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Gym / Business</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">City</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {demos.map((demo) => {
                    const name = demo.name ?? demo.full_name ?? "—";
                    const gymName = demo.gym_name ?? demo.business_name ?? "—";
                    const status = (demo.status ?? "new") as string;
                    return (
                      <tr key={demo.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                            {gymName}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {demo.email && (
                            <a href={`mailto:${demo.email}`}
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                              <Mail className="size-3.5" />
                              <span className="text-xs">{demo.email}</span>
                            </a>
                          )}
                          {demo.phone && (
                            <a href={`tel:${demo.phone}`}
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground mt-0.5">
                              <Phone className="size-3.5" />
                              <span className="text-xs">{demo.phone}</span>
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{demo.city ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
                            {status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                          {new Date(demo.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] text-xs text-muted-foreground truncate">
                          {String(demo.message ?? "—")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">{total} bookings</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                {page > 1 && (
                  <a href={`/superadmin/demos?page=${page - 1}${sp.status ? `&status=${sp.status}` : ""}`}
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted">
                    Prev
                  </a>
                )}
                {page < totalPages && (
                  <a href={`/superadmin/demos?page=${page + 1}${sp.status ? `&status=${sp.status}` : ""}`}
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted">
                    Next
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
