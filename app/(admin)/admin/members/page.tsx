import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPortalContext } from "@/lib/auth";
import {
  listMembersRich,
  getBranchOptions,
  getPlanOptions,
  getTrainerOptions,
} from "@/services/member-extended.service";
import { createClient } from "@/lib/supabase/server";
import { MemberFilters } from "@/components/members/member-filters";
import { MemberExcelImportDialog } from "@/components/members/member-excel-import-dialog";
import { MemberViewToggle } from "@/components/members/member-view-toggle";
import { ExpiringPlansCard } from "@/components/members/expiring-plans-card";
import { EXPIRY_QUICK_FILTERS, getExpiringWithinDays, getExpiryDateRange } from "@/lib/member-expiry";

export const metadata = { title: "Members Register" };

async function optionalData<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    // Filter options must not prevent the member register from rendering when a
    // supplementary request (for example, a transient Supabase fetch) fails.
    console.error("Unable to load optional members-page data:", error);
    return fallback;
  }
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const profile = await getPortalContext();
  const branchId = profile?.branch_id ?? null;
  const role = profile?.role?.slug ?? null;
  const timeZone = profile?.tenant_timezone ?? profile?.branch_timezone ?? "Asia/Kolkata";

  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = Math.max(1, Math.min(60, Number(sp.pageSize ?? 24)));
  const financialYearDates = getFinancialYearDates(sp.financial_year);
  const selectedExpiringWithin = getExpiringWithinDays(sp.expiring_within);

  const expiringDateRange = selectedExpiringWithin === undefined
    ? undefined
    : getExpiryDateRange(selectedExpiringWithin, timeZone);

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
      expiryDateFrom: expiringDateRange?.from ?? (sp.exp_from || undefined),
      expiryDateTo: expiringDateRange?.to ?? (sp.exp_to || undefined),
      subscriptionStartFrom: financialYearDates?.from,
      subscriptionStartTo: financialYearDates?.to,
    }),
    getBranchOptions({ tenantId: profile?.tenant_id, branchId: profile?.branch_id, role: profile?.role?.slug }),
    getPlanOptions(branchId),
    optionalData(getTrainerOptions(branchId), []),
    (async () => {
      const { createClient: cc } = await import("@/lib/supabase/server");
      const sb = await cc();
      const effectiveBranch = sp.branch || branchId || null;
      const bindBranch = (query: any) => (effectiveBranch ? query.eq("branch_id", effectiveBranch) : query);
      const bindFinancialYear = (query: any) => financialYearDates
        ? query.gte("start_date", financialYearDates.from).lte("start_date", financialYearDates.to)
        : query;
      const today = getExpiryDateRange(0, timeZone).from;
      const expiringThrough = getExpiryDateRange(Math.max(...EXPIRY_QUICK_FILTERS.map(({ days }) => days)), timeZone).to;
      const [totalMembers, activeMembers, inactiveMembers, activeSubs, expiredSubs, pendingSubs, pausedSubs, cancelledSubs, expiringMembers] = await Promise.all([
        bindBranch(sb.from("members").select("id", { count: "exact", head: true })),
        bindBranch(sb.from("members").select("id", { count: "exact", head: true }).eq("status", "active")),
        bindBranch(sb.from("members").select("id", { count: "exact", head: true }).eq("status", "inactive")),
        bindFinancialYear(bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"))),
        bindFinancialYear(bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired"))),
        bindFinancialYear(bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "pending"))),
        bindFinancialYear(bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "paused"))),
        bindFinancialYear(bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "cancelled"))),
        bindBranch(sb.from("member_register_view").select("member_id,subscription_end").eq("member_status", "active").eq("subscription_status", "active").gte("subscription_end", today).lte("subscription_end", expiringThrough)),
      ]);
      const expiryCountDays = Array.from(new Set([...EXPIRY_QUICK_FILTERS.map(({ days }) => days), ...(selectedExpiringWithin === undefined ? [] : [selectedExpiringWithin])]));
      return {
        totalMembers: totalMembers.count ?? 0,
        activeMembers: activeMembers.count ?? 0,
        inactiveMembers: inactiveMembers.count ?? 0,
        activeSubs: activeSubs.count ?? 0,
        expiredSubs: expiredSubs.count ?? 0,
        pendingSubs: pendingSubs.count ?? 0,
        pausedSubs: pausedSubs.count ?? 0,
        cancelledSubs: cancelledSubs.count ?? 0,
        expiringMemberCounts: expiryCountDays.reduce<Record<number, number>>((counts, days) => {
          const throughDate = getExpiryDateRange(days, timeZone).to;
          counts[days] = new Set(
            (expiringMembers.data ?? [])
              .filter((subscription: { member_id: string; subscription_end: string }) => subscription.subscription_end <= throughDate)
              .map((subscription: { member_id: string }) => subscription.member_id),
          ).size;
          return counts;
        }, {}),
      };
    })(),
  ]);

  const today = getExpiryDateRange(0, timeZone).from;
  const supabase = await createClient();
  const memberIds = result.data.map((member) => member.member_id);
  const [attendanceRes, lastVisitRes, invoicesRes] = await Promise.all([
    memberIds.length
      ? supabase.from("attendance").select("member_id").in("member_id", memberIds).eq("attendance_date", today)
      : { data: [] },
    memberIds.length
      ? supabase.from("attendance").select("member_id, attendance_date").in("member_id", memberIds).lt("attendance_date", today).order("attendance_date", { ascending: false })
      : { data: [] },
    memberIds.length
      ? supabase.from("invoices").select("id, member_id, created_at").in("member_id", memberIds).neq("status", "void").order("created_at", { ascending: false })
      : { data: [] },
  ]);

  const attendanceMap: Record<string, boolean> = {};
  for (const row of attendanceRes.data ?? []) attendanceMap[row.member_id] = true;

  const lastVisitMap: Record<string, string> = {};
  for (const row of lastVisitRes.data ?? []) {
    if (!lastVisitMap[row.member_id]) lastVisitMap[row.member_id] = row.attendance_date;
  }

  const invoiceMap: Record<string, string> = {};
  for (const invoice of invoicesRes.data ?? []) {
    if (!invoiceMap[invoice.member_id]) invoiceMap[invoice.member_id] = invoice.id;
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Members" value={statusCounts.totalMembers} href="/admin/members" />
        <StatCard label="Active" value={statusCounts.activeMembers} href="/admin/members?status=active" />
        <StatCard label="Inactive" value={statusCounts.inactiveMembers} href="/admin/members?status=inactive" />
        <StatCard label="Active Plans" value={statusCounts.activeSubs} href="/admin/members?sub_status=active" />

      </div>

      <ExpiringPlansCard counts={statusCounts.expiringMemberCounts} selectedDays={selectedExpiringWithin} editableDays />

      <Card className="overflow-hidden rounded-3xl">
        <MemberFilters
          branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
          plans={plans.map((plan) => ({ id: plan.id, name: plan.name }))}
          trainers={trainers.map((trainer) => ({ id: trainer.id, name: trainer.name }))}
          subscriptionCounts={{ active: statusCounts.activeSubs, expired: statusCounts.expiredSubs, pending: statusCounts.pendingSubs, paused: statusCounts.pausedSubs, cancelled: statusCounts.cancelledSubs }}
          basePath="/admin/members"
        />
        <div className="p-4 md:p-5">
          <MemberViewToggle
            data={result.data}
            basePath="/admin/members"
            role={role}
            attendanceMap={attendanceMap}
            lastVisitMap={lastVisitMap}
            invoiceMap={invoiceMap}
            trainers={trainers.map((trainer) => ({ id: trainer.id, name: trainer.name }))}
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

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      aria-label={`View ${label.toLowerCase()}`}
      className="group rounded-3xl border border-border/70 bg-background px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="mt-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">View members &rarr;</p>
    </Link>
  );
}

function getFinancialYearDates(financialYear?: string) {
  if (financialYear === "2025-2026") return { from: "2025-04-01", to: "2026-03-31" };
  if (financialYear === "2026-2027") return { from: "2026-04-01", to: "2027-03-31" };
  return undefined;
}
function PaginationLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) return <span className="cursor-not-allowed rounded-xl border px-3 py-2 text-xs opacity-40">{label}</span>;
  return <Link href={href} className="rounded-xl border px-3 py-2 text-xs transition-colors hover:bg-muted">{label}</Link>;
}
