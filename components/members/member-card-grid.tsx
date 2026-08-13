import Link from "next/link";
import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { ArrowRight, CreditCard, Dumbbell, MessageCircle, Phone, RefreshCcw, ScanLine } from "lucide-react";
import type { MemberRegisterRow, UserRole } from "@/types";
import { MemberAvatar } from "@/components/members/member-avatar";
import { AttendanceTodayBadge, MemberStatusBadge, SubscriptionStatusBadge } from "@/components/members/member-badges";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const actionPermissions: Record<string, UserRole[]> = {
  call: ["admin", "manager", "reception", "trainer", "dietician", "diet-planner", "diet_planner"],
  whatsapp: ["admin", "manager", "reception", "trainer", "dietician", "diet-planner", "diet_planner"],
  collect_payment: ["admin", "manager", "reception"],
  renew: ["admin", "manager", "reception"],
  punch_in: ["admin", "manager", "reception"],
  assign_trainer: ["admin", "manager", "reception"],
};

function canUse(action: keyof typeof actionPermissions, role: UserRole | null | undefined) {
  return !!role && actionPermissions[action].includes(role);
}

function getPrimaryStatus(member: MemberRegisterRow) {
  if (member.member_status !== "active") return { label: "Inactive", tone: "outline" as const };
  if ((member.balance_amount ?? 0) > 0 && (member.days_remaining ?? 999) < 0) return { label: "Payment Overdue", tone: "destructive" as const };
  if ((member.days_remaining ?? 999) < 0) return { label: "Expired", tone: "destructive" as const };
  if ((member.balance_amount ?? 0) > 0) return { label: "Payment Due", tone: "warning" as const };
  if (member.subscription_status === "paused") return { label: "Frozen", tone: "warning" as const };
  if ((member.days_remaining ?? 999) <= 7) return { label: "Expiring Soon", tone: "warning" as const };
  return { label: "Active", tone: "success" as const };
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy") : value;
}

function lastVisitLabel(value: string | undefined) {
  if (!value) return "No visits yet";
  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

function normalizePhone(phone: string | null | undefined) {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  return cleaned || null;
}

function getWhatsAppLink(phone: string | null | undefined, member: MemberRegisterRow) {
  const cleaned = normalizePhone(phone);
  if (!cleaned) return null;
  const number = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  const text = `Hi ${member.full_name}, this is SyncFyre regarding your ${member.current_plan ?? "membership"}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function actionHref(basePath: string, memberId: string, action: "payments" | "membership") {
  return `${basePath}/${memberId}?tab=${action}`;
}

export function MemberCardGrid({
  data,
  basePath,
  role,
  attendanceMap,
  lastVisitMap,
}: {
  data: MemberRegisterRow[];
  basePath: string;
  role: UserRole | null | undefined;
  attendanceMap: Record<string, boolean>;
  lastVisitMap: Record<string, string>;
}) {
  if (!data.length) {
    return (
      <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed bg-background p-6 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-lg font-semibold">No members found</p>
          <p className="text-sm text-muted-foreground">Adjust your filters or search terms. New members will appear here after registration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {data.map((member) => {
        const status = getPrimaryStatus(member);
        const lastVisit = lastVisitMap[member.member_id];
        const dueAmount = member.balance_amount ?? 0;
        const engagement = Math.max(0, Math.min(100,
          Math.round(
            (((attendanceMap[member.member_id] ? 100 : 55) * 0.2) +
            ((member.days_remaining ?? 0) > 0 ? 85 : 45) * 0.2 +
            (dueAmount <= 0 ? 100 : 55) * 0.3 +
            (member.assigned_trainer ? 80 : 50) * 0.15 +
            (lastVisit ? 75 : 40) * 0.15)
          ),
        ));
        const whatsapp = getWhatsAppLink(member.phone, member);
        const phone = normalizePhone(member.phone);

        return (
          <Card key={member.member_id} className="overflow-hidden rounded-3xl border-border/70">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant={status.tone === "destructive" ? "danger" : status.tone === "warning" ? "warning" : status.tone === "success" ? "success" : "outline"}>{status.label}</Badge>
                  {dueAmount > 0 ? <Badge variant="outline">{formatCurrency(dueAmount)} due</Badge> : null}
                </div>
                <Link href={`${basePath}/${member.member_id}`} aria-label={`Open ${member.full_name} Member 360`} className="rounded-full p-2 text-muted-foreground transition hover:bg-background hover:text-foreground">
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              <Link href={`${basePath}/${member.member_id}`} className="block space-y-4 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <MemberAvatar name={member.full_name} photoUrl={member.profile_photo_url} size="lg" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{member.full_name}</h3>
                      <MemberStatusBadge status={member.member_status} />
                    </div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">M ID: {member.member_code}</p>
                    <p className="text-sm text-muted-foreground">{member.phone ?? "No phone"}</p>
                    {member.current_plan ? <SubscriptionStatusBadge status={member.subscription_status} /> : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Due Amount" value={dueAmount > 0 ? formatCurrency(dueAmount) : "Cleared"} accent={dueAmount > 0} />
                  <Stat label="Plan" value={member.current_plan ?? "No plan"} />
                  <Stat label="Expiry" value={formatDate(member.subscription_end)} />
                  <Stat label="Trainer" value={member.assigned_trainer ?? "Not assigned"} />
                  <Stat label="Attendance" value={attendanceMap[member.member_id] ? "Present today" : "Not checked in"} />
                  <Stat label="Last Visit" value={lastVisitLabel(lastVisit)} />
                </div>
              </Link>

              <div className="border-t border-border/70 bg-muted/20 px-4 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Engagement</p>
                    <p className="text-lg font-semibold">{engagement}%</p>
                  </div>
                  <AttendanceTodayBadge present={!!attendanceMap[member.member_id]} />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                  {canUse("call", role) && phone ? <a href={`tel:${phone}`} className={buttonVariants({ variant: "outline", size: "sm" })}><Phone className="size-4" />Call</a> : null}
                  {canUse("whatsapp", role) && whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><MessageCircle className="size-4" />WhatsApp</a> : null}
                  {canUse("renew", role) ? <Link href={actionHref(basePath, member.member_id, "membership")} className={buttonVariants({ size: "sm" })}><RefreshCcw className="size-4" />Renew</Link> : null}
                  {canUse("collect_payment", role) ? <Link href={actionHref(basePath, member.member_id, "payments")} className={buttonVariants({ variant: "outline", size: "sm" })}><CreditCard className="size-4" />Collect</Link> : null}
                  {canUse("punch_in", role) ? <Link href="/reception/attendance" className={buttonVariants({ variant: "outline", size: "sm" })}><ScanLine className="size-4" />Punch In</Link> : null}
                  {canUse("assign_trainer", role) ? <Link href={`${basePath}/${member.member_id}?tab=workouts`} className={buttonVariants({ variant: "outline", size: "sm" })}><Dumbbell className="size-4" />Trainer</Link> : null}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-background px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={accent ? "mt-1 truncate text-sm font-semibold text-red-600" : "mt-1 truncate text-sm font-semibold"}>{value}</p>
    </div>
  );
}
