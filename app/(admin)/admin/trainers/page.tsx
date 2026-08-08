import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search, UserRoundCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { getTrainerReport } from "@/services/report.service";

export const metadata = { title: "Trainers" };

export default async function AdminTrainersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requireUser(["admin", "manager"]);

  const allTrainers = await getTrainerReport({
    branchId: profile.branch_id ?? undefined,
    status: "all",
  });

  // Client-side filtering on the array (trainer_report_view already scopes to branch via RLS)
  const search = (sp.q ?? "").toLowerCase().trim();
  const statusFilter = sp.status ?? "all";

  const filtered = allTrainers.filter((t) => {
    const matchSearch =
      !search ||
      t.trainer_name.toLowerCase().includes(search) ||
      (t.email ?? "").toLowerCase().includes(search);
    const matchStatus =
      statusFilter === "all" || t.trainer_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Pagination
  const pageSize = 20;
  const currentPage = Math.max(1, Number(sp.page ?? 1));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.status && sp.status !== "all") params.set("status", sp.status);
    params.set("page", String(p));
    return `/admin/trainers?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Trainers</h1>
          <p className="text-sm text-muted-foreground">
            Manage trainer profiles, assigned members, and schedules.
          </p>
        </div>
        <Link href="/admin/trainers/new" className={buttonVariants({ className: "ml-auto" })}>
          <Plus className="size-4" />
          Add Trainer
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{allTrainers.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total trainers</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {allTrainers.filter((t) => t.trainer_status === "active").length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Active</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">
            {allTrainers.reduce((s, t) => s + t.active_assigned_members, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Total assigned members</p>
        </div>
      </div>

      <Card>
        {/* Filters */}
        <form className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={sp.q}
              className="pl-9"
              placeholder="Search by name or email"
            />
          </div>
          <select
            name="status"
            defaultValue={sp.status ?? "all"}
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <input type="hidden" name="page" value="1" />
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            Apply
          </button>
        </form>

        {/* Table */}
        {paginated.length === 0 ? (
          <CardContent className="grid min-h-64 place-items-center text-center">
            <div>
              <UserRoundCog className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No trainers found</p>
              <p className="text-sm text-muted-foreground">
                Add your first trainer or adjust the filters.
              </p>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {["Name", "Specializations", "Experience", "Assigned", "Upcoming Apts", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginated.map((t) => (
                  <tr key={t.trainer_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{t.trainer_name}</p>
                      <p className="text-xs text-muted-foreground">{t.email ?? t.phone ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.specializations.length > 0
                          ? t.specializations.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                              >
                                {s}
                              </span>
                            ))
                          : <span className="text-muted-foreground">—</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {t.experience_years > 0 ? `${t.experience_years} yrs` : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {t.active_assigned_members}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {t.upcoming_appointments}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.trainer_status === "active" ? "success" : "outline"}>
                        {t.trainer_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/trainers/${t.trainer_id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>
            {filtered.length} trainer{filtered.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={pageUrl(currentPage - 1)}
              aria-disabled={currentPage <= 1}
              aria-label="Previous page"
              className={
                buttonVariants({ variant: "outline", size: "icon" }) +
                (currentPage <= 1 ? " pointer-events-none opacity-40" : "")
              }
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={pageUrl(currentPage + 1)}
              aria-disabled={currentPage >= totalPages}
              aria-label="Next page"
              className={
                buttonVariants({ variant: "outline", size: "icon" }) +
                (currentPage >= totalPages ? " pointer-events-none opacity-40" : "")
              }
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
