"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, List, Pencil, Phone, RefreshCcw, CreditCard } from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import type { MemberRegisterRow, UserRole } from "@/types";
import { MemberCardGrid } from "@/components/members/member-card-grid";
import { MembersRegisterTable } from "@/components/members/members-register-table";
import { MemberAvatar } from "@/components/members/member-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { MemberCommunicationMenu } from "@/components/members/member-communication-menu";

// ─── Pre-written WhatsApp messages by situation ───────────────────────────────
function getWhatsAppMessage(member: MemberRegisterRow): string {
  const name = member.full_name;
  const plan = member.current_plan ?? "membership";
  const due = member.balance_amount ?? 0;
  const days = member.days_remaining ?? 999;
  const expiry = member.subscription_end
    ? format(parseISO(member.subscription_end), "dd MMM yyyy")
    : "";

  if (due > 0 && days < 0) {
    return `Hi ${name}, your ${plan} has expired and there is a pending balance of ₹${due.toLocaleString("en-IN")}. Please visit us or call to clear your dues and renew your membership. – SyncFyre Gym`;
  }
  if (due > 0) {
    return `Hi ${name}, you have a pending balance of ₹${due.toLocaleString("en-IN")} for your ${plan}. Please clear your dues at the earliest. – SyncFyre Gym`;
  }
  if (days < 0) {
    return `Hi ${name}, your ${plan} expired on ${expiry}. Renew now to continue enjoying unlimited gym access. Call us or visit the reception. – SyncFyre Gym`;
  }
  if (days <= 7) {
    return `Hi ${name}, your ${plan} is expiring in ${days} day${days === 1 ? "" : "s"} (${expiry}). Renew now to avoid a gap in your membership. – SyncFyre Gym`;
  }
  return `Hi ${name}, this is SyncFyre Gym regarding your ${plan}. Please contact us if you have any queries.`;
}

function buildWhatsAppLink(phone: string | null | undefined, message: string) {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  if (!cleaned) return null;
  const number = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function buildCallLink(phone: string | null | undefined) {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

function formatDate(v: string | null | undefined) {
  if (!v) return "—";
  const p = parseISO(v);
  return isValid(p) ? format(p, "dd MMM yy") : v;
}

function lastVisitLabel(v: string | undefined) {
  if (!v) return "No visits";
  const p = parseISO(v);
  return isValid(p) ? formatDistanceToNowStrict(p, { addSuffix: true }) : v;
}

// ─── Status colour helper ──────────────────────────────────────────────────────
function getStatusVariant(member: MemberRegisterRow): "success" | "warning" | "danger" | "outline" {
  const due = member.balance_amount ?? 0;
  const days = member.days_remaining ?? 999;
  if (member.member_status !== "active") return "outline";
  if (due > 0 && days < 0) return "danger";
  if (days < 0) return "danger";
  if (due > 0) return "warning";
  if (days <= 7) return "warning";
  return "success";
}

function getStatusLabel(member: MemberRegisterRow) {
  const due = member.balance_amount ?? 0;
  const days = member.days_remaining ?? 999;
  if (member.member_status !== "active") return "Inactive";
  if (due > 0 && days < 0) return "Overdue";
  if (days < 0) return "Expired";
  if (due > 0) return "Due";
  if (days <= 7) return "Expiring";
  return "Active";
}

// ─── Row view ─────────────────────────────────────────────────────────────────
function MemberRowView({
  data,
  basePath,
  attendanceMap,
  lastVisitMap,
}: {
  data: MemberRegisterRow[];
  basePath: string;
  attendanceMap: Record<string, boolean>;
  lastVisitMap: Record<string, string>;
}) {
  if (!data.length) {
    return (
      <div className="grid min-h-48 place-items-center p-8 text-center text-sm text-muted-foreground">
        No members found. Try changing your search or filters.
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop table (md+) ─────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              {["Member", "Status", "Plan", "Expiry", "Due Amount", "Trainer", "Attendance", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((member) => {
              const statusVariant = getStatusVariant(member);
              const statusLabel = getStatusLabel(member);
              const due = member.balance_amount ?? 0;
              const callLink = buildCallLink(member.phone);
              const today = attendanceMap[member.member_id];
              const lastVisit = lastVisitMap[member.member_id];
              const days = member.days_remaining ?? 999;

              return (
                <tr
                  key={member.member_id}
                  className="group hover:bg-muted/20 transition-colors"
                >
                  {/* Member */}
                  <td className="px-4 py-3">
                    <Link href={`${basePath}/${member.member_id}`} className="flex items-center gap-3">
                      <MemberAvatar name={member.full_name} photoUrl={member.profile_photo_url} size="sm" />
                      <div>
                        <p className="font-semibold hover:text-primary">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">{member.member_code} · {member.phone ?? "—"}</p>
                      </div>
                    </Link>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                  </td>
                  {/* Plan */}
                  <td className="px-4 py-3">
                    <p>{member.current_plan ?? "No plan"}</p>
                    {member.subscription_status && member.subscription_status !== "active" && (
                      <p className="text-xs capitalize text-muted-foreground">{member.subscription_status}</p>
                    )}
                  </td>
                  {/* Expiry */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {formatDate(member.subscription_end)}
                    {days >= 0 && days <= 30 && (
                      <p className="text-xs text-amber-600 font-medium">{days}d left</p>
                    )}
                  </td>
                  {/* Due */}
                  <td className="px-4 py-3 tabular-nums">
                    {due > 0
                      ? <span className="font-semibold text-red-600">{formatCurrency(due)}</span>
                      : <span className="text-emerald-600 text-xs font-medium">Cleared</span>
                    }
                  </td>
                  {/* Trainer */}
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {member.assigned_trainer ?? "—"}
                  </td>
                  {/* Attendance */}
                  <td className="px-4 py-3">
                    {today
                      ? <Badge variant="success">Present</Badge>
                      : <span className="text-xs text-muted-foreground">{lastVisitLabel(lastVisit)}</span>
                    }
                  </td>
                  {/* Actions — visible on row hover */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      {callLink && (
                        <a href={callLink}
                          className={buttonVariants({ variant: "ghost", size: "icon" })}
                          title="Call" aria-label={`Call ${member.full_name}`}>
                          <Phone className="size-4" />
                        </a>
                      )}
                      <MemberCommunicationMenu phone={member.phone} memberName={member.full_name} gymName="SyncFyre Gym" planName={member.current_plan} subscriptionStatus={member.subscription_status} expiryDate={member.subscription_end} dueAmount={due} daysRemaining={member.days_remaining} />
                      <Link href={`${basePath}/${member.member_id}?tab=membership`}
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                        title="Renew" aria-label={`Renew ${member.full_name}`}>
                        <RefreshCcw className="size-4" />
                      </Link>
                      <Link href={`${basePath}/${member.member_id}?tab=payments`}
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                        title="Payments">
                        <CreditCard className="size-4" />
                      </Link>
                      <Link href={`${basePath}/${member.member_id}?edit=1`}
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                        title="Edit" aria-label={`Edit ${member.full_name}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile compact rows (< md) ──────────────────────────── */}
      <div className="divide-y md:hidden">
        {data.map((member) => {
          const statusVariant = getStatusVariant(member);
          const statusLabel = getStatusLabel(member);
          const due = member.balance_amount ?? 0;
          const callLink = buildCallLink(member.phone);

          return (
            <div key={member.member_id} className="px-4 py-4 space-y-2">
              <div className="flex items-center gap-3">
                <MemberAvatar name={member.full_name} photoUrl={member.profile_photo_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <Link href={`${basePath}/${member.member_id}`}>
                    <p className="font-semibold truncate">{member.full_name}</p>
                  </Link>
                  <p className="text-xs text-muted-foreground">{member.member_code} · {member.phone ?? "—"}</p>
                </div>
                <Link href={`${basePath}/${member.member_id}?edit=1`}
                  className={buttonVariants({ variant: "ghost", size: "icon" })}>
                  <Pencil className="size-4" />
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={statusVariant}>{statusLabel}</Badge>
                <span className="rounded-full border px-2 py-0.5">{member.current_plan ?? "No plan"}</span>
                {due > 0
                  ? <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-600">Due: {formatCurrency(due)}</span>
                  : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-600">Cleared</span>
                }
                {member.subscription_end && (
                  <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
                    Exp: {formatDate(member.subscription_end)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {callLink && (
                  <a href={callLink} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Phone className="size-3.5" />Call
                  </a>
                )}
                <MemberCommunicationMenu phone={member.phone} memberName={member.full_name} gymName="SyncFyre Gym" planName={member.current_plan} subscriptionStatus={member.subscription_status} expiryDate={member.subscription_end} dueAmount={due} daysRemaining={member.days_remaining} variant="full" />
                <Link href={`${basePath}/${member.member_id}?tab=membership`}
                  className={buttonVariants({ size: "sm" })}>
                  <RefreshCcw className="size-3.5" />Renew
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main export — View Toggle wrapper ────────────────────────────────────────
export function MemberViewToggle({
  data,
  basePath,
  role,
  attendanceMap,
  lastVisitMap,
  trainers,
}: {
  data: MemberRegisterRow[];
  basePath: string;
  role: UserRole | null | undefined;
  attendanceMap: Record<string, boolean>;
  lastVisitMap: Record<string, string>;
  trainers: { id: string; name: string }[];
}) {
  const [view, setView] = useState<"cards" | "rows">("rows");

  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("members_view");
    if (saved === "rows" || saved === "cards") setView(saved);
  }, []);

  function toggle(v: "cards" | "rows") {
    setView(v);
    localStorage.setItem("members_view", v);
  }

  return (
    <div>
      {/* Toggle buttons — right-aligned, sits inside the filter row visually */}
      <div className="flex items-center justify-end gap-1 border-b px-4 py-2">
        <span className="mr-auto text-xs text-muted-foreground">
          {data.length} member{data.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => toggle("cards")}
          title="Card view"
          aria-label="Switch to card view"
          aria-pressed={view === "cards"}
          className={`rounded-lg p-2 transition-colors ${view === "cards" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          <LayoutGrid className="size-4" />
        </button>
        <button
          onClick={() => toggle("rows")}
          title="Full register view"
          aria-label="Switch to full member register view"
          aria-pressed={view === "rows"}
          className={`rounded-lg p-2 transition-colors ${view === "rows" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          <List className="size-4" />
        </button>
      </div>

      {view === "cards" ? (
        <MemberCardGrid
          data={data}
          basePath={basePath}
          role={role}
          attendanceMap={attendanceMap}
          lastVisitMap={lastVisitMap}
          trainers={trainers}
        />
      ) : (
        <MembersRegisterTable data={data} basePath={basePath} attendanceMap={attendanceMap} lastVisitMap={lastVisitMap} />
      )}
    </div>
  );
}
