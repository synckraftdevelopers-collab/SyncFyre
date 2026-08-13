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
  getDieticianOptions,
} from "@/services/member-extended.service";
import {
  PersonalTab,
  MembershipTab,
  PaymentsTab,
  AttendanceTab,
  ProgressTab,
  WorkoutsTab,
  DietTab,
  NotificationsTab,
} from "@/components/members/member-detail-tabs";

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
         progress, workouts, dietPlans, notifications, plans, trainers, dieticians] =
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
      getDieticianOptions(profile.branch_id),
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
              <EditMemberSection id={id} branches={[]} trainers={trainers} dieticians={dieticians} member={member} />
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



// ─── Edit section (lazy) ──────────────────────────────────────────────────────
async function EditMemberSection({
  id, branches, trainers, dieticians, member,
}: {
  id: string;
  branches: { id: string; name: string }[];
  trainers: { id: string; name: string }[];
  dieticians: { id: string; name: string }[];
    member: any;
}) {
  const { MemberEditForm } = await import("@/components/members/member-edit-form");
  return <MemberEditForm member={member} branches={branches} trainers={trainers} dieticians={dieticians} />;
}
