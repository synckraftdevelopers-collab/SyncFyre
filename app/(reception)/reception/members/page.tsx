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

export const metadata = { title: "Members" };

export default async function ReceptionMembersPage({
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
  const expiringDateRange = selectedExpiringWithin === undefined ? undefined : getExpiryDateRange(selectedExpiringWithin, timeZone);

  const [result, branches, plans, trainers, subscriptionCounts] = await Promise.all([
    listMembersRich({
      page,
      pageSize,
      search: sp.q || undefined,
      branchId: sp.branch || branchId || undefined,
      status: sp.status || "active",
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
    getTrainerOptions(branchId),
    (async () => {
      const sb = await createClient();
      const effectiveBranch = sp.branch || branchId || null;
      const bindBranch = (query: any) => effectiveBranch ? query.eq("branch_id", effectiveBranch) : query;
      const bindFinancialYear = (query: any) => financialYearDates
        ? query.gte("start_date", financialYearDates.from).lte("start_date", financialYearDates.to)
        : query;
      const today = getExpiryDateRange(0, timeZone).from;
      const [active, expired, pending, paused, cancelled] = await Promise.all(
        ["active", "expired", "pending", "paused", "cancelled"].map((status) =>
          bindFinancialYear(bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", status))),
        ),
      );
      const expiringThrough = getExpiryDateRange(Math.max(...EXPIRY_QUICK_FILTERS.map(({ days }) => days)), timeZone).to;
      const { data: expiringMembers } = await bindBranch(
        sb.from("member_register_view").select("member_id, subscription_end").eq("member_status", "active").eq("subscription_status", "active").gte("subscription_end", today).lte("subscription_end", expiringThrough),
      );
      return {
        active: active.count ?? 0, expired: expired.count ?? 0, pending: pending.count ?? 0, paused: paused.count ?? 0, cancelled: cancelled.count ?? 0,
        expiringMemberCounts: EXPIRY_QUICK_FILTERS.reduce<Record<number, number>>((counts, { days }) => {
          const throughDate = getExpiryDateRange(days, timeZone).to;
          counts[days] = new Set(
            (expiringMembers ?? [])
              .filter((subscription: { member_id: string; subscription_end: string }) => subscription.subscription_end <= throughDate)
              .map((subscription: { member_id: string }) => subscription.member_id),
          ).size;
          return counts;
        }, {}),
      };
    })(),  ]);

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
    return `/reception/members?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">Fast member operations for front desk teams with real attendance, dues, and membership data.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <MemberExcelImportDialog branches={branches.filter((branch) => branch.id === branchId).map((branch) => ({ id: branch.id, name: branch.name }))} defaultBranchId={branchId} />
          <Link href="/reception/members/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            Add Member
          </Link>
        </div>
      </div>

      <ExpiringPlansCard
        counts={subscriptionCounts.expiringMemberCounts}
        selectedDays={selectedExpiringWithin}
        basePath="/reception/members"
      />

      <Card className="overflow-hidden rounded-3xl">
        <MemberFilters
          branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
          plans={plans.map((plan) => ({ id: plan.id, name: plan.name }))}
          trainers={trainers.map((trainer) => ({ id: trainer.id, name: trainer.name }))}
          subscriptionCounts={subscriptionCounts}
          basePath="/reception/members"
        />
        <div className="p-4 md:p-5">
          <MemberViewToggle
            data={result.data}
            basePath="/reception/members"
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

function getFinancialYearDates(financialYear?: string) {
  if (financialYear === "2025-2026") return { from: "2025-04-01", to: "2026-03-31" };
  if (financialYear === "2026-2027") return { from: "2026-04-01", to: "2027-03-31" };
  return undefined;
}
function PaginationLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) return <span className="cursor-not-allowed rounded-xl border px-3 py-2 text-xs opacity-40">{label}</span>;
  return <Link href={href} className="rounded-xl border px-3 py-2 text-xs transition-colors hover:bg-muted">{label}</Link>;
}
