import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import {
  listMembersRich,
  getBranchOptions,
  getPlanOptions,
  getTrainerOptions,
} from "@/services/member-extended.service";
import { createClient } from "@/lib/supabase/server";
import { MemberFilters } from "@/components/members/member-filters";
import { MemberExcelImportDialog } from "@/components/members/member-excel-import-dialog";
import { MemberCardGrid } from "@/components/members/member-card-grid";

export const metadata = { title: "Members Register" };

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id ?? null;
  const role = profile?.role?.slug ?? null;

  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = Math.max(1, Math.min(60, Number(sp.pageSize ?? 24)));

  const [result, branches, plans, trainers, statusCounts] = await Promise.all([
    listMembersRich({
      page,
      pageSize,
      search: sp.q || undefined,
      branchId: sp.branch || branchId || undefined,
      status: sp.status || undefined,
      planId: sp.plan || undefined,
      trainerId: sp.trainer || undefined,
      gender: sp.gender || undefined,
      subscriptionStatus: sp.sub_status || undefined,
      joinDateFrom: sp.join_from || undefined,
      joinDateTo: sp.join_to || undefined,
      expiryDateFrom: sp.exp_from || undefined,
      expiryDateTo: sp.exp_to || undefined,
    }),
    getBranchOptions(),
    getPlanOptions(branchId),
    getTrainerOptions(branchId),
    (async () => {
      const { createClient: cc } = await import("@/lib/supabase/server");
      const sb = await cc();
      const effectiveBranch = sp.branch || branchId || null;
      const bindBranch = (query: any) => (effectiveBranch ? query.eq("branch_id", effectiveBranch) : query);
      const [totalMembers, activeMembers, inactiveMembers, activeSubs, expiredSubs] = await Promise.all([
        bindBranch(sb.from("members").select("id", { count: "exact", head: true })),
        bindBranch(sb.from("members").select("id", { count: "exact", head: true }).eq("status", "active")),
        bindBranch(sb.from("members").select("id", { count: "exact", head: true }).eq("status", "inactive")),
        bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active")),
        bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired")),
      ]);
      return {
        totalMembers: totalMembers.count ?? 0,
        activeMembers: activeMembers.count ?? 0,
        inactiveMembers: inactiveMembers.count ?? 0,
        activeSubs: activeSubs.count ?? 0,
        expiredSubs: expiredSubs.count ?? 0,
      };
    })(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const memberIds = result.data.map((member) => member.member_id);
  const [attendanceRes, lastVisitRes] = await Promise.all([
    memberIds.length
      ? supabase.from("attendance").select("member_id").in("member_id", memberIds).eq("attendance_date", today)
      : { data: [] },
    memberIds.length
      ? supabase.from("attendance").select("member_id, attendance_date").in("member_id", memberIds).lt("attendance_date", today).order("attendance_date", { ascending: false })
      : { data: [] },
  ]);

  const attendanceMap: Record<string, boolean> = {};
  for (const row of attendanceRes.data ?? []) attendanceMap[row.member_id] = true;

  const lastVisitMap: Record<string, string> = {};
  for (const row of lastVisitRes.data ?? []) {
    if (!lastVisitMap[row.member_id]) lastVisitMap[row.member_id] = row.attendance_date;
  }

  function pageUrl(nextPage: number) {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("page", String(nextPage));
    return `/admin/members?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">Professional member operations with real plan, payment, attendance, and trainer data.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <MemberExcelImportDialog branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))} defaultBranchId={branchId} />
          <Link href="/admin/members/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            Add Member
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total Members" value={statusCounts.totalMembers} />
        <StatCard label="Active" value={statusCounts.activeMembers} />
        <StatCard label="Inactive" value={statusCounts.inactiveMembers} />
        <StatCard label="Active Plans" value={statusCounts.activeSubs} />
        <StatCard label="Expired Plans" value={statusCounts.expiredSubs} />
      </div>

      <Card className="overflow-hidden rounded-3xl">
        <MemberFilters
          branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
          plans={plans.map((plan) => ({ id: plan.id, name: plan.name }))}
          trainers={trainers.map((trainer) => ({ id: trainer.id, name: trainer.name }))}
          basePath="/admin/members"
        />
        <div className="p-4 md:p-5">
          <MemberCardGrid
            data={result.data}
            basePath="/admin/members"
            role={role}
            attendanceMap={attendanceMap}
            lastVisitMap={lastVisitMap}
          />
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between md:px-5">
          <span className="text-muted-foreground">Showing {Math.min((page - 1) * pageSize + 1, result.total)}-{Math.min(page * pageSize, result.total)} of {result.total.toLocaleString()} members</span>
          <div className="flex items-center gap-2">
            <PaginationLink href={pageUrl(page - 1)} disabled={page <= 1} label="Prev" />
            <span className="px-2 text-xs text-muted-foreground">{page} / {Math.max(1, result.totalPages)}</span>
            <PaginationLink href={pageUrl(page + 1)} disabled={page >= result.totalPages} label="Next" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function PaginationLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) return <span className="cursor-not-allowed rounded-xl border px-3 py-2 text-xs opacity-40">{label}</span>;
  return <Link href={href} className="rounded-xl border px-3 py-2 text-xs transition-colors hover:bg-muted">{label}</Link>;
}
