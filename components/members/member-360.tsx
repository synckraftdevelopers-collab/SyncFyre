import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Apple, Bell, CreditCard, Dumbbell, FileUp, MessageCircle, Phone, ScanLine, TrendingUp, UserCog, Wallet } from "lucide-react";
import type { UserRole } from "@/types";
import { MemberProgressChart } from "@/components/progress/member-progress-chart";
import { MemberAvatar } from "@/components/members/member-avatar";
import { BackButton } from "@/components/ui/back-button";
import { MemberProfileTabs } from "@/components/members/member-profile-tabs";
import { AssignDieticianDialog } from "@/components/members/assign-dietician-dialog";
import { AssignTrainerDialog } from "@/components/members/assign-trainer-dialog";
import { DeleteMemberDialog } from "@/components/members/delete-member-dialog";
import { PhotoUpload } from "@/components/members/photo-upload";
import { RenewMembershipDialog } from "@/components/members/renew-membership-dialog";
import {
  AttendanceTodayBadge,
  MemberStatusBadge,
  PaymentStatusBadge,
  SubscriptionStatusBadge,
} from "@/components/members/member-badges";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateAge, calculateBmi, formatCurrency } from "@/lib/utils";
import type {
  FullMember,
  MemberPayment,
  MemberSubscription,
} from "@/services/member-extended.service";

type AttendanceSummary = {
  todayPresent: boolean;
  lastVisitDate: string | null;
  totalVisits: number;
  currentMonthVisits: number;
};

type AttendanceRecord = {
  attendance_id: string;
  attendance_date: string;
  entry_time_ist: string | null;
  exit_time_ist: string | null;
  duration_label: string;
  source?: string | null;
};

type ProgressRecord = {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  bmi: number | null;
  body_fat_percent: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm?: number | null;
  biceps_cm?: number | null;
  thigh_cm?: number | null;
  notes: string | null;
};

type WorkoutRecord = {
  id: string;
  name: string;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  cardio_minutes: number | null;
  scheduled_date: string | null;
  trainer_notes: string | null;
};

type DietPlanRecord = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  snacks: string | null;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  water_liters: number | null;
};

type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  channels?: string[] | null;
};

type ReceivableRecord = {
  id: string;
  invoice_id: string | null;
  original_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string | null;
  status: string;
  receivable_type: string;
};

type ActivityRecord = {
  id: string;
  action: string;
  entity_type: string;
  description: string | null;
  created_at: string;
};

type Option = { id: string; name: string };
type PlanOption = { id: string; name: string; price: number; gst_percent: number; discount_percent: number; duration_months: number };

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "membership", label: "Membership" },
  { id: "payments", label: "Payments" },
  { id: "attendance", label: "Attendance" },
  { id: "workout", label: "Workout" },
  { id: "diet", label: "Diet" },
  { id: "progress", label: "Progress" },
  { id: "communication", label: "Communication" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity" },
];

const paymentModeLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  online: "Net Banking",
  wallet: "Wallet",
};

function canUse(role: UserRole | null | undefined, actions: UserRole[]) {
  return !!role && actions.includes(role);
}

function formatDate(value: string | null | undefined, pattern = "dd MMM yyyy") {
  if (!value) return "-";
  try {
    return format(parseISO(value), pattern);
  } catch {
    return value;
  }
}

function actionLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getEngagement(member: FullMember, attendance: AttendanceSummary, latestSubscription: MemberSubscription | undefined, receivables: ReceivableRecord[], workouts: WorkoutRecord[], dietPlans: DietPlanRecord[], notifications: NotificationRecord[]) {
  const outstanding = receivables.reduce((sum, item) => sum + Number(item.balance_amount ?? 0), 0);
  const attendanceScore = Math.min(100, Math.round((attendance.currentMonthVisits / 20) * 100));
  const workoutScore = workouts.length ? 85 : 45;
  const paymentScore = outstanding <= 0 ? 100 : outstanding < 3000 ? 72 : 45;
  const trainerScore = member.assigned_trainer_id ? 75 : 40;
  const appActivityScore = notifications.length ? 60 : 35;
  const total = Math.round((attendanceScore * 0.28) + (workoutScore * 0.22) + (paymentScore * 0.24) + (trainerScore * 0.14) + (appActivityScore * 0.12));
  const label = total >= 80 ? "Highly Engaged" : total >= 60 ? "Moderately Engaged" : "Needs Attention";
  return {
    total,
    label,
    breakdown: [
      { label: "Attendance", value: attendanceScore },
      { label: "Workout", value: workoutScore },
      { label: "Payments", value: paymentScore },
      { label: "Trainer", value: trainerScore },
      { label: "App Activity", value: appActivityScore },
    ],
  };
}

function getAging(receivables: ReceivableRecord[]) {
  const now = new Date();
  const buckets = { "0-30 Days": 0, "31-60 Days": 0, "61-90 Days": 0, "90+ Days": 0 };
  for (const item of receivables) {
    if (!item.due_date) continue;
    const diff = Math.max(0, Math.floor((now.getTime() - new Date(item.due_date).getTime()) / 86400000));
    if (diff <= 30) buckets["0-30 Days"] += Number(item.balance_amount ?? 0);
    else if (diff <= 60) buckets["31-60 Days"] += Number(item.balance_amount ?? 0);
    else if (diff <= 90) buckets["61-90 Days"] += Number(item.balance_amount ?? 0);
    else buckets["90+ Days"] += Number(item.balance_amount ?? 0);
  }
  return buckets;
}

export function Member360({
  basePath,
  listHref,
  collectPaymentHref,
  role,
  member,
  subscriptions,
  payments,
  attendance,
  attendanceRecords,
  progress,
  workouts,
  dietPlans,
  notifications,
  receivables,
  activity,
  plans,
  trainers,
  dieticians,
  activeTab,
  allowDelete = false,
}: {
  basePath: string;
  listHref: string;
  collectPaymentHref: string;
  role: UserRole | null | undefined;
  member: FullMember;
  subscriptions: MemberSubscription[];
  payments: MemberPayment[];
  attendance: AttendanceSummary;
  attendanceRecords: AttendanceRecord[];
  progress: ProgressRecord[];
  workouts: WorkoutRecord[];
  dietPlans: DietPlanRecord[];
  notifications: NotificationRecord[];
  receivables: ReceivableRecord[];
  activity: ActivityRecord[];
  plans: PlanOption[];
  trainers: Option[];
  dieticians: Option[];
  activeTab: string;
  allowDelete?: boolean;
}) {
  const age = member.date_of_birth ? calculateAge(member.date_of_birth) : null;
  const bmi = calculateBmi(member.height_cm, member.weight_kg);
  const latestSubscription = subscriptions[0];
  const activeSubscription = subscriptions.find((item) => item.status === "active") ?? latestSubscription;
  const totalPaid = payments.filter((item) => item.payment_status === "completed").reduce((sum, item) => sum + Number(item.net_amount), 0);
  const outstanding = receivables.reduce((sum, item) => sum + Number(item.balance_amount ?? 0), 0);
  const engagement = getEngagement(member, attendance, latestSubscription, receivables, workouts, dietPlans, notifications);
  const aging = getAging(receivables);
  const trainerName = trainers.find((item) => item.id === member.assigned_trainer_id)?.name ?? "Not assigned";
  const dieticianName = dieticians.find((item) => item.id === member.assigned_dietician_id)?.name ?? "Not assigned";
  const latestProgress = progress[0];
  const mobile = member.phone.replace(/\D/g, "");
  const whatsappHref = mobile ? `https://wa.me/${mobile.startsWith("91") ? mobile : `91${mobile}`}` : null;
  const collectPaymentLink = `${collectPaymentHref}${collectPaymentHref.includes("?") ? "&" : "?"}memberId=${member.id}`;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <BackButton href={listHref} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={`${basePath}/${member.id}?edit=1`} className={buttonVariants({ variant: "outline", size: "sm" })}>Edit Member</Link>
          {allowDelete ? <DeleteMemberDialog memberId={member.id} memberName={member.full_name} redirectTo={listHref} /> : null}
        </div>
      </div>

      <Card className="overflow-hidden rounded-3xl">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <PhotoUpload memberId={member.id} currentPhotoUrl={member.profile_photo_url} memberName={member.full_name} />
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{member.full_name}</h1>
                <span className="text-sm font-medium text-muted-foreground">{member.member_code}</span>
                <MemberStatusBadge status={member.status} />
                <SubscriptionStatusBadge status={activeSubscription?.status ?? null} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span>{member.phone}</span>
                {member.email ? <span>{member.email}</span> : null}
                {activeSubscription?.plan_name ? <span>{activeSubscription.plan_name}</span> : null}
                {age ? <span>{age} yrs</span> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <a href={`tel:${member.phone}`} className={buttonVariants({ variant: "outline", size: "sm" })}><Phone className="size-4" />Call</a>
                {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><MessageCircle className="size-4" />WhatsApp</a> : null}
                {canUse(role, ["admin", "manager", "reception"]) ? <Link href={collectPaymentLink} className={buttonVariants({ size: "sm" })}><CreditCard className="size-4" />Collect Payment</Link> : null}
                {canUse(role, ["admin", "manager", "reception"]) ? <RenewMembershipDialog memberId={member.id} branchId={member.branch_id} plans={plans} /> : null}
              </div>
            </div>

            <div className="grid min-w-full grid-cols-2 gap-3 lg:min-w-[320px]">
              <StatTile label="Outstanding" value={outstanding > 0 ? formatCurrency(outstanding) : "Cleared"} accent={outstanding > 0} />
              <StatTile label="Attendance" value={`${attendance.currentMonthVisits} visits`} />
              <StatTile label="Trainer" value={trainerName} />
              <StatTile label="Dietician" value={dieticianName} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-3xl">
        <MemberProfileTabs tabs={TABS} activeTab={activeTab} memberId={member.id} basePath={basePath} />
        <div className="space-y-5 p-5 md:p-6">
          {activeTab === "overview" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard title="Membership" rows={[['Plan', activeSubscription?.plan_name ?? 'No active plan'], ['Start', formatDate(activeSubscription?.start_date)], ['Expiry', formatDate(activeSubscription?.end_date)], ['Status', actionLabel(activeSubscription?.status ?? 'inactive')]]} />
                <InfoCard title="Financial" rows={[['Plan Amount', activeSubscription ? formatCurrency(activeSubscription.total_amount) : '-'], ['Paid', formatCurrency(totalPaid)], ['Due', outstanding ? formatCurrency(outstanding) : 'Cleared'], ['Invoices', String(payments.length)]]} />
                <InfoCard title="Attendance" rows={[['This Month', `${attendance.currentMonthVisits} visits`], ['Last Visit', formatDate(attendance.lastVisitDate)], ['Attendance Rate', `${Math.min(100, Math.round((attendance.currentMonthVisits / 24) * 100))}%`], ['Today', attendance.todayPresent ? 'Present' : 'Absent']]} />
                <InfoCard title="Trainer" rows={[['Assigned Trainer', trainerName], ['Dietician', dieticianName], ['Workout Plans', String(workouts.length)], ['Diet Plans', String(dietPlans.length)]]} />
              </div>

              <Card className="rounded-3xl border-border/70 shadow-none">
                <CardHeader>
                  <CardTitle>Engagement Score</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-bold">{engagement.total}%</p>
                      <p className="text-sm text-muted-foreground">{engagement.label}</p>
                    </div>
                    <AttendanceTodayBadge present={attendance.todayPresent} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {engagement.breakdown.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-border/70 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-lg font-semibold">{item.value}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/70 shadow-none">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <a href={`tel:${member.phone}`} className={buttonVariants({ variant: "outline", size: "sm" })}><Phone className="size-4" />Call</a>
                    {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><MessageCircle className="size-4" />WhatsApp</a> : null}
                    {canUse(role, ["admin", "manager", "reception"]) ? <Link href={collectPaymentLink} className={buttonVariants({ size: "sm" })}><Wallet className="size-4" />Collect Payment</Link> : null}
                    {canUse(role, ["admin", "manager", "reception"]) ? <Link href={`${basePath}/${member.id}?tab=membership`} className={buttonVariants({ variant: "outline", size: "sm" })}><TrendingUp className="size-4" />Renew</Link> : null}
                    {canUse(role, ["admin", "manager", "reception"]) ? <Link href="/reception/attendance" className={buttonVariants({ variant: "outline", size: "sm" })}><ScanLine className="size-4" />Punch In</Link> : null}
                    {canUse(role, ["admin", "manager", "reception"]) ? <AssignTrainerDialog memberId={member.id} currentTrainerId={member.assigned_trainer_id} trainers={trainers} /> : null}
                    {canUse(role, ["admin", "manager", "reception"]) ? <AssignDieticianDialog memberId={member.id} currentDieticianId={member.assigned_dietician_id} dieticians={dieticians} /> : null}
                    <div className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-60" })}><FileUp className="size-4" />Upload Document</div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {activeTab === "membership" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Membership History</h2>
                {canUse(role, ["admin", "manager", "reception"]) ? <RenewMembershipDialog memberId={member.id} branchId={member.branch_id} plans={plans} /> : null}
              </div>
              <ResponsiveTable headers={["Plan", "Start", "Expiry", "Status", "Total", "Renewals"]} rows={subscriptions.map((item) => [item.plan_name, formatDate(item.start_date), formatDate(item.end_date), <SubscriptionStatusBadge key={item.id} status={item.status} />, formatCurrency(item.total_amount), String(item.times_renewed)])} empty="No membership history available." />
            </div>
          ) : null}

          {activeTab === "payments" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard title="Total Amount Paid" rows={[["Collected", formatCurrency(totalPaid)]]} />
                <InfoCard title="Outstanding" rows={[["Pending", outstanding ? formatCurrency(outstanding) : 'Cleared']]} />
                <InfoCard title="Support Modes" rows={[["Accepted", 'Cash / UPI / Card / Net Banking / Wallet']]} />
              </div>
              <ResponsiveTable headers={["Date", "Invoice", "Amount", "Payment Mode", "Status", "Created By"]} rows={payments.map((item) => [formatDate(item.payment_date), item.invoice_number ?? '-', formatCurrency(item.net_amount), paymentModeLabels[item.payment_method] ?? item.payment_method, <PaymentStatusBadge key={item.payment_id} status={item.payment_status} />, item.collected_by ?? '-'])} empty="No payment history." />
            </div>
          ) : null}

          {activeTab === "attendance" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard title="This Month" rows={[["Visits", String(attendance.currentMonthVisits)]]} />
                <InfoCard title="Attendance Rate" rows={[["Rate", `${Math.min(100, Math.round((attendance.currentMonthVisits / 24) * 100))}%`]]} />
                <InfoCard title="Last Visit" rows={[["Date", formatDate(attendance.lastVisitDate)]]} />
                <InfoCard title="Today" rows={[["Status", attendance.todayPresent ? 'Present' : 'Absent']]} />
              </div>
              <ResponsiveTable headers={["Check-in Date", "Check-in Time", "Check-out Time", "Method"]} rows={attendanceRecords.map((item) => [formatDate(item.attendance_date), item.entry_time_ist ?? '-', item.exit_time_ist ?? '-', actionLabel(item.source ?? 'manual')])} empty="No attendance records." />
            </div>
          ) : null}

          {activeTab === "workout" ? (
            workouts.length ? (
              <div className="space-y-5">
                <InfoCard title="Current Workout Plan" rows={[["Plan", workouts[0].name], ["Assigned", formatDate(workouts[0].scheduled_date)], ["Trainer", trainerName], ["Progress", `${Math.min(100, 40 + workouts.length * 8)}%`]]} />
                <ResponsiveTable headers={["Plan", "Exercise", "Sets", "Reps", "Weight", "Scheduled"]} rows={workouts.map((item) => [item.name, item.exercise_name, String(item.sets ?? '-'), String(item.reps ?? '-'), item.weight_kg ? `${item.weight_kg} kg` : '-', formatDate(item.scheduled_date)])} empty="No workout plan assigned." />
              </div>
            ) : <EmptyState text="No workout plan assigned." actionLabel="Assign Workout" />
          ) : null}

          {activeTab === "diet" ? (
            dietPlans.length ? (
              <div className="space-y-5">
                <InfoCard title="Current Diet Plan" rows={[["Plan", dietPlans[0].name], ["Calories", dietPlans[0].calories ? `${dietPlans[0].calories} kcal` : '-'], ["Protein", dietPlans[0].protein_g ? `${dietPlans[0].protein_g}g` : '-'], ["Valid Until", formatDate(dietPlans[0].end_date)]]} />
                {dietPlans.map((item) => (
                  <Card key={item.id} className="rounded-3xl border-border/70 shadow-none">
                    <CardHeader><CardTitle>{item.name}</CardTitle></CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      <DietRow label="Breakfast" value={item.breakfast} />
                      <DietRow label="Lunch" value={item.lunch} />
                      <DietRow label="Dinner" value={item.dinner} />
                      <DietRow label="Snacks" value={item.snacks} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : <EmptyState text="No diet plan assigned." actionLabel="Assign Diet" />
          ) : null}

          {activeTab === "progress" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard title="Weight" rows={[["Current", latestProgress?.weight_kg ? `${latestProgress.weight_kg} kg` : member.weight_kg ? `${member.weight_kg} kg` : '-']]} />
                <InfoCard title="Height" rows={[["Current", member.height_cm ? `${member.height_cm} cm` : '-']]} />
                <InfoCard title="BMI" rows={[["Current", latestProgress?.bmi ? String(latestProgress.bmi) : bmi ? String(bmi) : '-']]} />
                <InfoCard title="Body Fat" rows={[["Current", latestProgress?.body_fat_percent != null ? `${latestProgress.body_fat_percent}%` : '-']]} />
              </div>
              <MemberProgressChart records={progress} />
              <ResponsiveTable headers={["Date", "Weight", "BMI", "Body Fat", "Chest", "Waist"]} rows={progress.map((item) => [formatDate(item.measured_at), item.weight_kg ? `${item.weight_kg} kg` : '-', item.bmi ? String(item.bmi) : '-', item.body_fat_percent != null ? `${item.body_fat_percent}%` : '-', item.chest_cm ? `${item.chest_cm} cm` : '-', item.waist_cm ? `${item.waist_cm} cm` : '-'])} empty="No measurements found." />
            </div>
          ) : null}

          {activeTab === "communication" ? (
            notifications.length ? (
              <Timeline items={notifications.map((item) => ({ id: item.id, title: item.title, body: item.message, when: formatDate(item.created_at, 'dd MMM yyyy, hh:mm a') }))} />
            ) : <EmptyState text="No communication history." />
          ) : null}

          {activeTab === "documents" ? (
            <EmptyState text="No documents uploaded yet." actionLabel="Upload Document" />
          ) : null}

          {activeTab === "activity" ? (
            activity.length ? (
              <ResponsiveTable headers={["Date", "Time", "User Action"]} rows={activity.map((item) => [formatDate(item.created_at), formatDate(item.created_at, 'hh:mm a'), item.description ?? actionLabel(item.action)])} empty="No activity history." />
            ) : <EmptyState text="No activity history." />
          ) : null}

          {outstanding > 0 && activeTab === "payments" ? (
            <Card className="rounded-3xl border-border/70 shadow-none">
              <CardHeader>
                <CardTitle>Outstanding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="danger">{formatCurrency(outstanding)} Outstanding</Badge>
                  <Link href={collectPaymentLink} className={buttonVariants({ size: 'sm' })}>Collect Payment</Link>
                  {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}>WhatsApp Reminder</a> : null}
                  <Link href={collectPaymentLink} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Payment Link</Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(aging).map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-border/70 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                      <p className="mt-1 text-lg font-semibold">{value ? formatCurrency(value) : '?0'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-3"><p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className={accent ? 'mt-1 text-sm font-semibold text-red-600' : 'mt-1 text-sm font-semibold'}>{value}</p></div>;
}

function InfoCard({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  return (
    <Card className="rounded-3xl border-border/70 shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>)}
      </CardContent>
    </Card>
  );
}

function ResponsiveTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <EmptyState text={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr>{headers.map((header) => <th key={header} className="px-3 py-3 font-medium">{header}</th>)}</tr></thead>
        <tbody className="divide-y">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className="px-3 py-3 align-top">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Timeline({ items }: { items: { id: string; title: string; body: string; when: string }[] }) {
  return <div className="space-y-3">{items.map((item) => <div key={item.id} className="rounded-2xl border border-border/70 p-4"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.body}</p><p className="mt-2 text-xs text-muted-foreground">{item.when}</p></div>)}</div>;
}

function DietRow({ label, value }: { label: string; value: string | null }) {
  return <div><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value ?? '-'}</p></div>;
}

function EmptyState({ text, actionLabel }: { text: string; actionLabel?: string }) {
  return <div className="rounded-3xl border border-dashed p-8 text-center"><p className="font-medium">{text}</p>{actionLabel ? <p className="mt-1 text-sm text-muted-foreground">{actionLabel} is available from supported member actions.</p> : <p className="mt-1 text-sm text-muted-foreground">This section will appear when real data exists.</p>}</div>;
}


