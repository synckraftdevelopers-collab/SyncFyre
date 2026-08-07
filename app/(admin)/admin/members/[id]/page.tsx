import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, UserX, RotateCcw, CreditCard, Bell } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { calculateAge, calculateBmi, formatCurrency } from "@/lib/utils";
import { MemberAvatar } from "@/components/members/member-avatar";
import { MemberProfileTabs } from "@/components/members/member-profile-tabs";
import {
  MemberStatusBadge,
  SubscriptionStatusBadge,
  DaysRemainingBadge,
  PaymentStatusBadge,
  AttendanceTodayBadge,
} from "@/components/members/member-badges";
import { DeleteMemberDialog } from "@/components/members/delete-member-dialog";
import { PhotoUpload } from "@/components/members/photo-upload";
import { RenewMembershipDialog } from "@/components/members/renew-membership-dialog";
import { AssignTrainerDialog } from "@/components/members/assign-trainer-dialog";
import {
  getMemberById,
  getMemberSubscriptions,
  getMemberPayments,
  getMemberAttendanceSummary,
  getMemberAttendanceRecords,
  getMemberProgress,
  getMemberWorkouts,
  getMemberDietPlans,
  getMemberNotifications,
  getPlanOptions,
  getTrainerOptions,
} from "@/services/member-extended.service";

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; edit?: string }>;
}) {
  const { id }   = await params;
  const { tab, edit } = await searchParams;
  const profile  = await requireUser(["admin", "manager", "reception"]);

  // ── Parallel data fetches ────────────────────────────────────────────────
  const [member, subscriptions, payments, attendance, attendanceRecords,
         progress, workouts, dietPlans, notifications, plans, trainers] =
    await Promise.all([
      getMemberById(id),
      getMemberSubscriptions(id),
      getMemberPayments(id),
      getMemberAttendanceSummary(id),
      getMemberAttendanceRecords(id),
      getMemberProgress(id),
      getMemberWorkouts(id),
      getMemberDietPlans(id),
      getMemberNotifications(id),
      getPlanOptions(profile.branch_id),
      getTrainerOptions(profile.branch_id),
    ]);

  if (!member) notFound();

  const isAdmin     = profile.role?.slug === "admin";
  const canEdit     = ["admin","manager","reception"].includes(profile.role?.slug ?? "");
  const activeSub   = subscriptions.find((s) => s.status === "active");
  const latestSub   = subscriptions[0];
  const bmi         = calculateBmi(member.height_cm, member.weight_kg);
  const age         = member.date_of_birth ? calculateAge(member.date_of_birth) : null;
  const defaultTab  = tab ?? "profile";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* ── Back + Actions ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/members" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> Members
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canEdit && (
            <Link
              href={`/admin/members/${id}?edit=1`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="size-4" /> Edit
            </Link>
          )}
          <RenewMembershipDialog
            memberId={id}
            branchId={member.branch_id}
            plans={plans}
          />
          <AssignTrainerDialog
            memberId={id}
            currentTrainerId={member.assigned_trainer_id}
            trainers={trainers}
          />
          {isAdmin && (
            <DeleteMemberDialog memberId={id} memberName={member.full_name} />
          )}
        </div>
      </div>

      {/* ── Hero card ───────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <PhotoUpload memberId={id} currentPhotoUrl={member.profile_photo_url} memberName={member.full_name} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{member.full_name}</h1>
                <MemberStatusBadge status={member.status} />
                <SubscriptionStatusBadge status={activeSub?.status ?? latestSub?.status ?? null} />
              </div>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{member.member_code}</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {member.phone && <span>📞 {member.phone}</span>}
                {member.email && <span>✉ {member.email}</span>}
                {age && <span>🎂 {age} yrs</span>}
                {member.blood_group && <span>🩸 {member.blood_group}</span>}
              </div>
            </div>

            {/* Attendance today */}
            <div className="flex flex-col items-end gap-2 text-right">
              <AttendanceTodayBadge present={attendance.todayPresent} />
              <div className="text-xs text-muted-foreground">
                <p>Total visits: <strong>{attendance.totalVisits}</strong></p>
                <p>This month: <strong>{attendance.currentMonthVisits}</strong></p>
                {attendance.lastVisitDate && (
                  <p>Last visit: <strong>{format(parseISO(attendance.lastVisitDate), "dd MMM yyyy")}</strong></p>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4">
            <QuickStat label="Plan" value={activeSub?.plan_name ?? latestSub?.plan_name ?? "None"} />
            <QuickStat label="Expiry">
              {latestSub ? (
                <DaysRemainingBadge days={
                  Math.floor((new Date(latestSub.end_date).getTime() - Date.now()) / 86400000)
                } />
              ) : <span className="text-muted-foreground text-sm">—</span>}
            </QuickStat>
            <QuickStat label="Plan Amount" value={latestSub ? formatCurrency(latestSub.total_amount) : "—"} />
            <QuickStat label="Trainer" value={
              trainers.find((t) => t.id === member.assigned_trainer_id)?.name ?? "Not assigned"
            } />
          </div>
        </CardContent>
      </Card>

      {/* ── Profile tabs ────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <MemberProfileTabs
          activeTab={defaultTab}
          memberId={id}
          tabs={[
            { id: "profile",     label: "Personal Info" },
            { id: "membership",  label: "Membership" },
            { id: "payments",    label: "Payments" },
            { id: "attendance",  label: "Attendance" },
            { id: "progress",    label: "Progress" },
            { id: "workouts",    label: "Workouts" },
            { id: "diet",        label: "Diet Plan" },
            { id: "notifications", label: "Notifications" },
          ]}
        />
        <div className="p-5">
          {/* Personal */}
          {defaultTab === "profile" && (
            edit === "1" ? (
              <EditMemberSection id={id} branches={[]} trainers={trainers} member={member} />
            ) : (
              <PersonalTab member={member} age={age} bmi={bmi} />
            )
          )}
          {/* Membership */}
          {defaultTab === "membership" && (
            <MembershipTab subscriptions={subscriptions} plans={plans} memberId={id} branchId={member.branch_id} />
          )}
          {/* Payments */}
          {defaultTab === "payments" && <PaymentsTab payments={payments} />}
          {/* Attendance */}
          {defaultTab === "attendance" && (
            <AttendanceTab summary={attendance} records={attendanceRecords.data} />
          )}
          {/* Progress */}
          {defaultTab === "progress" && <ProgressTab records={progress} />}
          {/* Workouts */}
          {defaultTab === "workouts" && <WorkoutsTab workouts={workouts} />}
          {/* Diet */}
          {defaultTab === "diet" && <DietTab plans={dietPlans} />}
          {/* Notifications */}
          {defaultTab === "notifications" && <NotificationsTab items={notifications} />}
        </div>
      </Card>
    </div>
  );
}

// ─── QuickStat ────────────────────────────────────────────────────────────────
function QuickStat({ label, value, children }: {
  label: string; value?: string; children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-semibold text-sm">{children ?? value ?? "—"}</div>
    </div>
  );
}

// ─── Personal tab ────────────────────────────────────────────────────────────
function PersonalTab({ member, age, bmi }: {
  member: Awaited<ReturnType<typeof getMemberById>>;
  age: number | null;
  bmi: number | null;
}) {
  if (!member) return null;
  const sections = [
    { title: "Basic Details", rows: [
      ["Full name", member.full_name],
      ["Gender", member.gender ?? "—"],
      ["Date of birth", member.date_of_birth ? format(parseISO(member.date_of_birth), "dd MMM yyyy") : "—"],
      ["Age", age ? `${age} years` : "—"],
      ["Phone", member.phone],
      ["Email", member.email ?? "—"],
      ["Address", member.address ?? "—"],
    ]},
    { title: "Health & Fitness", rows: [
      ["Height", member.height_cm ? `${member.height_cm} cm` : "—"],
      ["Weight", member.weight_kg ? `${member.weight_kg} kg` : "—"],
      ["BMI", bmi ? String(bmi) : "—"],
      ["Blood group", member.blood_group ?? "—"],
      ["Fitness goal", member.fitness_goal ?? "—"],
      ["Medical conditions", member.medical_conditions ?? "—"],
    ]},
    { title: "Emergency Contact", rows: [
      ["Contact name", member.emergency_contact_name ?? "—"],
      ["Contact phone", member.emergency_contact_phone ?? "—"],
    ]},
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {sections.map((s) => (
        <div key={s.title}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</p>
          <dl className="space-y-2">
            {s.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 text-sm border-b pb-1.5 last:border-0">
                <dt className="text-muted-foreground flex-shrink-0">{k}</dt>
                <dd className="font-medium text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

// ─── Membership tab ───────────────────────────────────────────────────────────
function MembershipTab({ subscriptions, plans, memberId, branchId }: {
  subscriptions: Awaited<ReturnType<typeof getMemberSubscriptions>>;
  plans: { id: string; name: string; price: number; gst_percent: number; discount_percent: number; duration_months: number }[];
  memberId: string;
  branchId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Subscription History</h3>
        <RenewMembershipDialog memberId={memberId} branchId={branchId} plans={plans} />
      </div>
      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No subscriptions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                {["Plan","Start","End","Days Left","Status","Amount","GST","Total","Renewals"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscriptions.map((s) => {
                const daysLeft = Math.floor((new Date(s.end_date).getTime() - Date.now()) / 86400000);
                return (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="py-2.5 pr-4 font-medium">{s.plan_name}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{format(parseISO(s.start_date), "dd MMM yyyy")}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{format(parseISO(s.end_date), "dd MMM yyyy")}</td>
                    <td className="py-2.5 pr-4"><DaysRemainingBadge days={daysLeft} /></td>
                    <td className="py-2.5 pr-4"><SubscriptionStatusBadge status={s.status} /></td>
                    <td className="py-2.5 pr-4 tabular-nums">{formatCurrency(s.price)}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">{formatCurrency(s.gst_amount)}</td>
                    <td className="py-2.5 pr-4 tabular-nums font-semibold">{formatCurrency(s.total_amount)}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{s.times_renewed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Payments tab ─────────────────────────────────────────────────────────────
function PaymentsTab({ payments }: { payments: Awaited<ReturnType<typeof getMemberPayments>> }) {
  const totalPaid = payments.filter((p) => p.payment_status === "completed").reduce((s, p) => s + Number(p.net_amount), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3 text-sm">
          <p className="text-muted-foreground">Total paid</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border p-3 text-sm">
          <p className="text-muted-foreground">Transactions</p>
          <p className="mt-0.5 text-lg font-bold">{payments.length}</p>
        </div>
      </div>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No payments yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                {["Date","Invoice","Plan","Amount","Method","Status","Ref","By"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.payment_id} className="hover:bg-muted/20">
                  <td className="py-2.5 pr-4 whitespace-nowrap">{format(parseISO(p.payment_date), "dd MMM yyyy")}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{p.invoice_number ?? "—"}</td>
                  <td className="py-2.5 pr-4">{p.plan_name ?? "Direct"}</td>
                  <td className="py-2.5 pr-4 tabular-nums font-medium">{formatCurrency(p.net_amount)}</td>
                  <td className="py-2.5 pr-4 capitalize">{p.payment_method}</td>
                  <td className="py-2.5 pr-4"><PaymentStatusBadge status={p.payment_status} /></td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{p.transaction_reference ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{p.collected_by ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Attendance tab ───────────────────────────────────────────────────────────
function AttendanceTab({
  summary,
  records,
}: {
  summary: Awaited<ReturnType<typeof getMemberAttendanceSummary>>;
    records: any[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border p-3 text-sm">
          <p className="text-muted-foreground">Today</p>
          <div className="mt-1"><AttendanceTodayBadge present={summary.todayPresent} /></div>
        </div>
        <div className="rounded-xl border p-3 text-sm">
          <p className="text-muted-foreground">This month</p>
          <p className="mt-0.5 text-xl font-bold">{summary.currentMonthVisits}</p>
        </div>
        <div className="rounded-xl border p-3 text-sm">
          <p className="text-muted-foreground">Total visits</p>
          <p className="mt-0.5 text-xl font-bold">{summary.totalVisits}</p>
        </div>
        <div className="rounded-xl border p-3 text-sm">
          <p className="text-muted-foreground">Last visit</p>
          <p className="mt-0.5 font-semibold text-sm">
            {summary.lastVisitDate
              ? format(parseISO(summary.lastVisitDate), "dd MMM yyyy")
              : "Never"}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic">Attendance is recorded automatically by face machine. Manual edits are not allowed.</p>
      {records.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                {["Date","Entry","Exit","Duration"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((r) => (
                <tr key={r.attendance_id} className="hover:bg-muted/20">
                  <td className="py-2 pr-4 whitespace-nowrap">{format(parseISO(r.attendance_date), "dd MMM yyyy")}</td>
                  <td className="py-2 pr-4">{r.entry_time_ist ?? "—"}</td>
                  <td className="py-2 pr-4">{r.exit_time_ist ?? "—"}</td>
                  <td className="py-2 pr-4">{r.duration_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Progress tab ─────────────────────────────────────────────────────────────
function ProgressTab({ records }: { records: any[] }) {
  if (!records.length) return (
    <p className="py-8 text-center text-sm text-muted-foreground">No progress records yet.</p>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            {["Date","Weight","BMI","Body Fat %","Waist","Chest","Arms","Legs","Notes"].map((h) => (
              <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-muted/20">
              <td className="py-2 pr-4 whitespace-nowrap">{format(parseISO(r.measured_at), "dd MMM yyyy")}</td>
              <td className="py-2 pr-4">{r.weight_kg ?? "—"}</td>
              <td className="py-2 pr-4">{r.bmi ?? "—"}</td>
              <td className="py-2 pr-4">{r.body_fat_percent != null ? `${r.body_fat_percent}%` : "—"}</td>
              <td className="py-2 pr-4">{r.waist_cm ?? "—"}</td>
              <td className="py-2 pr-4">{r.chest_cm ?? "—"}</td>
              <td className="py-2 pr-4">{r.arms_cm ?? "—"}</td>
              <td className="py-2 pr-4">{r.legs_cm ?? "—"}</td>
              <td className="py-2 pr-4 text-muted-foreground max-w-[160px] truncate">{r.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Workouts tab ─────────────────────────────────────────────────────────────
function WorkoutsTab({ workouts }: { workouts: any[] }) {
  if (!workouts.length) return (
    <p className="py-8 text-center text-sm text-muted-foreground">No active workouts.</p>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            {["Name","Exercise","Sets","Reps","Weight","Cardio","Scheduled","Notes"].map((h) => (
              <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {workouts.map((w) => (
            <tr key={w.id} className="hover:bg-muted/20">
              <td className="py-2 pr-4 font-medium">{w.name}</td>
              <td className="py-2 pr-4">{w.exercise_name}</td>
              <td className="py-2 pr-4">{w.sets ?? "—"}</td>
              <td className="py-2 pr-4">{w.reps ?? "—"}</td>
              <td className="py-2 pr-4">{w.weight_kg ? `${w.weight_kg} kg` : "—"}</td>
              <td className="py-2 pr-4">{w.cardio_minutes ? `${w.cardio_minutes} min` : "—"}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{w.scheduled_date ? format(parseISO(w.scheduled_date), "dd MMM") : "—"}</td>
              <td className="py-2 pr-4 max-w-[140px] truncate text-muted-foreground">{w.trainer_notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Diet tab ─────────────────────────────────────────────────────────────────
function DietTab({ plans }: { plans: any[] }) {
  if (!plans.length) return (
    <p className="py-8 text-center text-sm text-muted-foreground">No active diet plans.</p>
  );
  return (
    <div className="space-y-4">
      {plans.map((p) => (
        <div key={p.id} className="rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">{p.name}</h4>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(p.start_date), "dd MMM yyyy")}
              {p.end_date ? ` – ${format(parseISO(p.end_date), "dd MMM yyyy")}` : " (ongoing)"}
            </span>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {[["Breakfast",p.breakfast],["Lunch",p.lunch],["Dinner",p.dinner],["Snacks",p.snacks]].map(([label,val]) =>
              val ? <div key={label as string}><p className="text-xs text-muted-foreground mb-0.5">{label}</p><p>{val}</p></div> : null
            )}
          </div>
          {(p.calories || p.protein_g || p.fat_g || p.carbs_g) && (
            <div className="mt-3 flex flex-wrap gap-4 border-t pt-3 text-xs">
              {p.calories && <span>🔥 {p.calories} kcal</span>}
              {p.protein_g && <span>🥩 {p.protein_g}g protein</span>}
              {p.fat_g && <span>🧈 {p.fat_g}g fat</span>}
              {p.carbs_g && <span>🍞 {p.carbs_g}g carbs</span>}
              {p.water_liters && <span>💧 {p.water_liters}L water</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Notifications tab ────────────────────────────────────────────────────────
function NotificationsTab({ items }: { items: any[] }) {
  if (!items.length) return (
    <p className="py-8 text-center text-sm text-muted-foreground">No notifications.</p>
  );
  return (
    <div className="space-y-2">
      {items.map((n) => (
        <div key={n.id} className={`flex items-start gap-3 rounded-xl border p-3.5 ${!n.read_at ? "bg-primary/3 border-primary/20" : ""}`}>
          <Bell className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{n.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {format(parseISO(n.created_at), "dd MMM yyyy, hh:mm a")}
            </p>
          </div>
          {!n.read_at && (
            <span className="mt-1 size-2 flex-shrink-0 rounded-full bg-primary" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Edit section (lazy) ──────────────────────────────────────────────────────
async function EditMemberSection({
  id, branches, trainers, member,
}: {
  id: string;
  branches: { id: string; name: string }[];
  trainers: { id: string; name: string }[];
    member: any;
}) {
  const { MemberEditForm } = await import("@/components/members/member-edit-form");
  return <MemberEditForm member={member} branches={branches} trainers={trainers} />;
}
