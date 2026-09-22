import Link from "next/link";
import { ArrowUpDown, Eye, MessageCircle, Pause, Play, Plus, RefreshCw, Search, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { getLocalDateKey } from "@/lib/time";
import { buildExpiredOrFilter } from "@/lib/member-expiry";
import { formatCurrency } from "@/lib/utils";
import { buildWhatsAppUrl, generateMembershipMessage } from "@/lib/member-messages";
import { updateSubscriptionStatusAction, renewSubscriptionAction } from "@/app/actions/subscription-actions";
import { SubscriptionExpiryBadge, SubscriptionStatusBadge } from "@/components/modules/subscription-status-badge";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Subscriptions" };

const SORTABLE_COLUMNS = [
  { label: "Member", column: "member" as const },
  { label: "Plan", column: "plan" as const },
  { label: "Period", column: "period" as const },
  { label: "Amount", column: "amount" as const },
  { label: "Auto renew", column: "auto_renew" as const },
  { label: "Status", column: "status" as const },
];

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; colSort?: string; colDir?: string }>;
}) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const params = await searchParams;
  const supabase = await createClient();

  // 13-prompt sprint, Prompt 5: fixed 7-day grace period on Growth/Scale
  // (migration 0053_grace_period_for_lapsed_subscriptions.sql) — an "active"
  // subscription can sit with a past end_date for up to this many days
  // before the nightly sweep expires it. Without this, a row inside its
  // grace window would show a green "Active" status badge next to a red
  // "Expired Nd ago" expiry badge, which reads as a bug to gym staff.
  const gracePeriodDays = (await hasCurrentFeature("advanced_membership")) ? 7 : 0;

  // Gym name for the Share button's pre-built WhatsApp message — the branch's
  // real name (Settings → Application Settings → Branch name), not a
  // hardcoded string. Every row on this page belongs to the same branch
  // (the query below always scopes to profile.branch_id), so one lookup
  // covers the whole table.
  let gymName = "SyncFyre Gym";
  if (profile.branch_id) {
    const { data: branchRow } = await supabase.from("branches").select("name").eq("id", profile.branch_id).maybeSingle();
    if (branchRow?.name) gymName = branchRow.name;
  }

  const isExpiredView = params.status === "expired";
  // Default for the Expired view: most-recently-expired subscriptions show
  // first (end_date descending). ?sort=oldest flips it to show the
  // longest-expired subscriptions first (end_date ascending), toggled via
  // the "Sort" button below. Every other status filter keeps the original
  // soonest-to-expire-first ordering, unaffected by this.
  const sortOldestFirst = isExpiredView && params.sort === "oldest";
  const sortAscending = isExpiredView ? sortOldestFirst : true;

  let query = supabase
    .from("subscriptions")
    .select("id, member_id, plan_id, start_date, end_date, status, auto_renew, total_amount, members(full_name, member_code, phone), membership_plans(name)")
    .order("end_date", { ascending: sortAscending });
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  if (params.status && params.status !== "all") {
    if (params.status === "expired") {
      // subscriptions.status is only ever written at invoice/payment/renewal
      // time — it is never revisited just because end_date has since passed
      // (see docs/MEMBER_EXPIRY_REALTIME_IMPLEMENTATION.md). A subscription
      // can be status='active' with end_date already in the past, and it
      // must still show up under "Expired" here. Other status values
      // (paused/pending/cancelled) are left exactly as before — this task is
      // scoped to the active-but-date-expired gap only.
      const todayKey = getLocalDateKey(new Date(), "Asia/Kolkata");
      query = query.or(buildExpiredOrFilter("status", "end_date", todayKey));
    } else {
      query = query.eq("status", params.status);
    }
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Per-column sort (the "shuffle"/sort-toggle buttons in the table header).
  // Uses colSort/colDir rather than sort/dir so it doesn't collide with the
  // pre-existing sort=oldest|recent param used by the Expired view above.
  const { sort: colSort, dir: colDir } = readSort(
    params as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );

  const search = params.q?.trim().toLowerCase() ?? "";
  let subscriptions = (data ?? []).filter((subscription) => {
    const member = subscription.members as unknown as { full_name: string | null; member_code: string | null } | null;
    const plan = subscription.membership_plans as unknown as { name: string | null } | null;
    return !search || member?.full_name?.toLowerCase().includes(search) || member?.member_code?.toLowerCase().includes(search) || plan?.name?.toLowerCase().includes(search);
  });

  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (s: (typeof subscriptions)[number]): string | number => {
      switch (colSort) {
        case "member":
          return (s.members as unknown as { full_name: string | null } | null)?.full_name ?? "";
        case "plan":
          return (s.membership_plans as unknown as { name: string | null } | null)?.name ?? "";
        case "period":
          return s.end_date ?? "";
        case "amount":
          return Number(s.total_amount) || 0;
        case "auto_renew":
          return s.auto_renew ? 1 : 0;
        case "status":
          return s.status ?? "";
        default:
          return "";
      }
    };
    subscriptions = [...subscriptions].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Review, pause, resume, or cancel member memberships.</p>
        </div>
        <Link href="/admin/subscriptions/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          New sale
        </Link>
      </div>
      <Card>
        <form className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={params.q} className="pl-9" placeholder="Search member, code, or plan" /></div>
          <select name="status" defaultValue={params.status ?? "all"} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select>
          <button className={buttonVariants({ variant: "outline" })}>Apply</button>
        </form>
        {isExpiredView && (
          <div className="flex items-center justify-end gap-2 border-b px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Sort:</span>
            <Link
              href={`/admin/subscriptions?${new URLSearchParams({
                ...(params.q ? { q: params.q } : {}),
                status: "expired",
                sort: sortOldestFirst ? "recent" : "oldest",
              }).toString()}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <ArrowUpDown className="size-3.5" />
              {sortOldestFirst ? "Longest expired first" : "Recently expired first"}
            </Link>
          </div>
        )}
        {subscriptions.length ?<div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr>{SORTABLE_COLUMNS.map(({ label, column }) => <SortableTh key={column} label={label} column={column} basePath="/admin/subscriptions" searchParams={params as Record<string, string | undefined>} currentSort={colSort} currentDir={colDir} paramNames={{ sort: "colSort", dir: "colDir" }} className="px-4 py-3 font-medium" />)}<th className="px-4 py-3 font-medium" key="actions">Actions</th></tr></thead><tbody className="divide-y">{subscriptions.map((subscription) => { const member = subscription.members as unknown as { full_name: string | null; member_code: string | null; phone: string | null } | null; const plan = subscription.membership_plans as unknown as { name: string | null } | null; const daysRemaining = subscription.end_date ? Math.floor((new Date(subscription.end_date).getTime() - Date.now()) / 86400000) : null; const whatsappMessage = generateMembershipMessage({ memberName: member?.full_name ?? "Member", gymName, planName: plan?.name ?? null, subscriptionStatus: subscription.status, expiryDate: subscription.end_date, dueAmount: null, daysRemaining }); const whatsappUrl = buildWhatsAppUrl(member?.phone ?? null, whatsappMessage); return <tr key={subscription.id} className="hover:bg-muted/30"><td className="px-4 py-3"><Link href={`/admin/members/${subscription.member_id}`} className="font-medium hover:text-primary hover:underline">{member?.full_name ?? "—"}</Link><p className="text-xs text-muted-foreground">{member?.member_code ?? ""}</p></td><td className="px-4 py-3">{plan?.name ?? "—"}</td><td className="px-4 py-3"><div className="space-y-1 whitespace-nowrap">{subscription.start_date} → {subscription.end_date}<div><SubscriptionExpiryBadge endDate={subscription.end_date} status={subscription.status} gracePeriodDays={gracePeriodDays} /></div></div></td><td className="px-4 py-3">{formatCurrency(Number(subscription.total_amount))}</td><td className="px-4 py-3">{subscription.auto_renew ? "Yes" : "No"}</td><td className="px-4 py-3"><SubscriptionStatusBadge status={subscription.status} /></td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Link href={`/admin/subscriptions/${subscription.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}><Eye className="size-3.5" />View</Link>{whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: subscription.status === "expired" ? "default" : "outline", size: "sm" })} aria-label={`Send WhatsApp to ${member?.full_name ?? "member"}`}><MessageCircle className="size-3.5" />Share</a>}{subscription.status === "active" && <><form action={renewSubscriptionAction.bind(null, subscription.id)}><button className={buttonVariants({ variant: "outline", size: "sm" })}><RefreshCw className="size-3.5" />Renew</button></form><form action={updateSubscriptionStatusAction.bind(null, subscription.id, "paused")}><button className={buttonVariants({ variant: "outline", size: "sm" })}><Pause className="size-3.5" />Pause</button></form><form action={updateSubscriptionStatusAction.bind(null, subscription.id, "cancelled")}><button className={buttonVariants({ variant: "destructive", size: "sm" })}><XCircle className="size-3.5" />Cancel</button></form></>}{subscription.status === "paused" && <><form action={renewSubscriptionAction.bind(null, subscription.id)}><button className={buttonVariants({ variant: "outline", size: "sm" })}><RefreshCw className="size-3.5" />Renew</button></form><form action={updateSubscriptionStatusAction.bind(null, subscription.id, "active")}><button className={buttonVariants({ size: "sm" })}><Play className="size-3.5" />Resume</button></form><form action={updateSubscriptionStatusAction.bind(null, subscription.id, "cancelled")}><button className={buttonVariants({ variant: "destructive", size: "sm" })}><XCircle className="size-3.5" />Cancel</button></form></>}{subscription.status === "expired" && <form action={renewSubscriptionAction.bind(null, subscription.id)}><button className={buttonVariants({ size: "sm" })}><RefreshCw className="size-3.5" />Renew</button></form>}{["pending", "cancelled"].includes(subscription.status) && <span className="text-xs text-muted-foreground">—</span>}</div></td></tr>; })}</tbody></table></div> : <CardContent className="grid min-h-64 place-items-center text-center"><div><p className="font-medium">No subscriptions found</p><p className="text-sm text-muted-foreground">Adjust the filters or create a membership sale.</p><Link href="/admin/subscriptions/new" className={buttonVariants({ className: "mt-4" })}><Plus className="size-4" />New sale</Link></div></CardContent>}
      </Card>
    </div>
  );
}
