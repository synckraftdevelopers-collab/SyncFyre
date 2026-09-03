import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Member360 } from "@/components/members/member-360";
import { MemberEditForm } from "@/components/members/member-edit-form";
import { Card, CardContent } from "@/components/ui/card";
import { getMemberFormConfiguration } from "@/services/member-form-config.service";
import { BackButton } from "@/components/ui/back-button";
import {
  getBranchOptions,
  getDieticianOptions,
  getMemberAttendanceRecords,
  getMemberAttendanceSummary,
  getMemberById,
  getMemberDietPlans,
  getMemberNotifications,
  getMemberPayments,
  getMemberProgress,
  getMemberSubscriptions,
  getMemberWorkouts,
  getPlanOptions,
  getTrainerOptions,
} from "@/services/member-extended.service";
async function optionalData<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { tab, edit } = await searchParams;
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();

  const [
    member,
    subscriptions,
    payments,
    attendance,
    attendanceRecords,
    progress,
    workouts,
    dietPlans,
    notifications,
    plans,
    branches,
    trainers,
    dieticians,
    memberFormFields,
    receivablesRes,
    activityRes,
  ] = await Promise.all([
    getMemberById(id),
    optionalData(getMemberSubscriptions(id), []),
    optionalData(getMemberPayments(id), []),
    optionalData(getMemberAttendanceSummary(id), { todayPresent: false, lastVisitDate: null, totalVisits: 0, currentMonthVisits: 0 }),
    optionalData(getMemberAttendanceRecords(id), { data: [], total: 0 }),
    optionalData(getMemberProgress(id), []),
    optionalData(getMemberWorkouts(id), []),
    optionalData(getMemberDietPlans(id), []),
    optionalData(getMemberNotifications(id), []),
    optionalData(getPlanOptions(profile.branch_id), []),
    optionalData(getBranchOptions({ tenantId: profile.tenant_id, branchId: profile.branch_id, role: profile.role?.slug }), []),
    optionalData(getTrainerOptions(profile.branch_id), []),
    optionalData(getDieticianOptions(profile.branch_id), []),
    profile.tenant_id ? getMemberFormConfiguration(profile.tenant_id) : Promise.resolve([]),
    supabase.from("receivables").select("id, invoice_id, original_amount, paid_amount, balance_amount, due_date, status, receivable_type").eq("member_id", id).order("due_date", { ascending: true }),
    supabase.from("activity_logs").select("id, action, entity_type, description, created_at").eq("branch_id", profile.branch_id).or(`entity_id.eq.${id},description.ilike.%member%`).order("created_at", { ascending: false }).limit(20),
  ]);

  if (!member) notFound();

  if (edit === "1") {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <BackButton href={`/admin/members/${id}`} confirmOnLeave />
          <h1 className="mt-2 text-2xl font-bold">Edit member</h1>
          <p className="text-sm text-muted-foreground">Update {member.full_name}&apos;s profile and assignment details.</p>
        </div>
        <Card><CardContent className="p-5 md:p-7"><MemberEditForm member={member} memberFormFields={memberFormFields} branches={branches} trainers={trainers} dieticians={dieticians} /></CardContent></Card>
      </div>
    );
  }
  return (
    <Member360
      basePath="/admin/members"
      listHref="/admin/members"
      collectPaymentHref="/admin/invoices/new"
      role={profile.role?.slug}
      member={member}
      subscriptions={subscriptions}
      payments={payments}
      attendance={attendance}
      attendanceRecords={attendanceRecords.data as any[]}
      progress={progress as any[]}
      workouts={workouts as any[]}
      dietPlans={dietPlans as any[]}
      notifications={notifications as any[]}
      receivables={receivablesRes.data ?? []}
      activity={activityRes.data ?? []}
      plans={plans}
      trainers={trainers}
      dieticians={dieticians}
      activeTab={tab ?? "overview"}
      allowDelete={profile.role?.slug === "admin"}
    />
  );
}
