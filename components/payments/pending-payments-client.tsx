"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { buildWhatsAppUrl, generatePaymentReminderMessage } from "@/lib/member-messages";
import type { PendingPaymentRow } from "@/services/payment.service";

type Sort = "highest" | "lowest" | "oldest" | "newest" | "name";

export function PendingPaymentsClient({ rows }: { rows: PendingPaymentRow[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("highest");
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState("all");
  const branches = useMemo(() => [...new Map(rows.map((row) => [row.branch_id, row.branch_name ?? "Unassigned"])).entries()], [rows]);
  const plans = useMemo(() => [...new Set(rows.map((row) => row.plan_name).filter(Boolean))] as string[], [rows]);
  const [plan, setPlan] = useState("all");
  const filtered = useMemo(() => rows.filter((row) => {
    const needle = query.trim().toLowerCase();
    const matched = !needle || [row.member_name, row.member_code, row.phone].some((value) => value?.toLowerCase().includes(needle));
    return matched && (branch === "all" || row.branch_id === branch) && (status === "all" || row.payment_status === status) && (plan === "all" || row.plan_name === plan);
  }).sort((a, b) => {
    if (sort === "highest") return b.pending_amount - a.pending_amount;
    if (sort === "lowest") return a.pending_amount - b.pending_amount;
    if (sort === "oldest") return +new Date(a.created_at) - +new Date(b.created_at);
    if (sort === "newest") return +new Date(b.created_at) - +new Date(a.created_at);
    return a.member_name.localeCompare(b.member_name);
  }), [rows, query, branch, status, plan, sort]);
  const totalPending = filtered.reduce((sum, row) => sum + row.pending_amount, 0);

  function whatsapp(row: PendingPaymentRow) {
    return buildWhatsAppUrl(row.phone, generatePaymentReminderMessage({ memberName: row.member_name, gymName: row.branch_name || "SyncFyre Gym", totalAmount: row.total_amount, paymentCompleted: row.amount_paid, pendingAmount: row.pending_amount }));
  }

  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 sm:max-w-xl">
      <div className="rounded-2xl border bg-background p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Pending Members</p><p className="mt-1 text-2xl font-bold">{filtered.length}</p></div>
      <div className="rounded-2xl border bg-background p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Pending Amount</p><p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(totalPending)}</p></div>
    </div>
    <div className="grid gap-3 rounded-2xl border bg-background p-3 md:grid-cols-5">
      <label className="relative md:col-span-2"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search name, member ID, phone" /></label>
      <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="highest">Highest pending</option><option value="lowest">Lowest pending</option><option value="oldest">Oldest pending</option><option value="newest">Newest pending</option><option value="name">Member name</option></select>
      <select value={branch} onChange={(event) => setBranch(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All branches</option>{branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      <select value={plan} onChange={(event) => setPlan(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All plans</option>{plans.map((name) => <option key={name} value={name}>{name}</option>)}</select>
    </div>
    <div className="hidden overflow-hidden rounded-2xl border md:block"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>{["Member", "Plan", "Total", "Paid", "Pending", "Status", "Expiry", "Branch", "Action"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y">{filtered.map((row) => <tr key={row.invoice_id} className="hover:bg-muted/30"><td className="px-4 py-3"><p className="font-medium">{row.member_name}</p><p className="text-xs text-muted-foreground">{row.member_code ?? "—"} · {row.phone ?? "No phone"}</p></td><td className="px-4 py-3">{row.plan_name ?? "—"}</td><td className="px-4 py-3 tabular-nums">{formatCurrency(row.total_amount)}</td><td className="px-4 py-3 tabular-nums">{formatCurrency(row.amount_paid)}</td><td className="px-4 py-3 font-semibold tabular-nums text-amber-700">{formatCurrency(row.pending_amount)}</td><td className="px-4 py-3"><Badge variant="warning">{row.payment_status}</Badge></td><td className="px-4 py-3 text-muted-foreground">{row.membership_expiry ? new Date(row.membership_expiry).toLocaleDateString("en-IN") : "—"}</td><td className="px-4 py-3 text-muted-foreground">{row.branch_name ?? "—"}</td><td className="px-4 py-3"><WhatsAppButton href={whatsapp(row)} /></td></tr>)}</tbody></table></div>
    <div className="grid gap-3 md:hidden">{filtered.map((row) => <div key={row.invoice_id} className="rounded-2xl border bg-background p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{row.member_name}</p><p className="text-xs text-muted-foreground">{row.member_code ?? "—"} · {row.plan_name ?? "No plan"}</p></div><Badge variant="warning">{row.payment_status}</Badge></div><dl className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-medium">{formatCurrency(row.total_amount)}</dd></div><div><dt className="text-xs text-muted-foreground">Paid</dt><dd className="font-medium">{formatCurrency(row.amount_paid)}</dd></div><div><dt className="text-xs text-muted-foreground">Pending</dt><dd className="font-semibold text-amber-700">{formatCurrency(row.pending_amount)}</dd></div></dl><div className="mt-4"><WhatsAppButton href={whatsapp(row)} full /></div></div>)}</div>
    {filtered.length === 0 && <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">No pending payments match these filters.</div>}
  </div>;
}

function WhatsAppButton({ href, full = false }: { href: string | null; full?: boolean }) {
  if (!href) return <Button variant="outline" size="sm" disabled className={full ? "w-full" : ""} title="Phone number not available"><MessageCircle className="size-4" />WhatsApp</Button>;
  return <a href={href} target="_blank" rel="noreferrer" className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#25D366]/50 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 ${full ? "w-full" : ""}`}><MessageCircle className="size-4" />WhatsApp</a>;
}