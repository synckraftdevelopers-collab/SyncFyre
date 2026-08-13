import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Member360 } from "@/components/members/member-360";
import {
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

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
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
    trainers,
    dieticians,
    receivablesRes,
    activityRes,
  ] = await Promise.all([
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
    supabase
      .from("receivables")
      .select("id, invoice_id, original_amount, paid_amount, balance_amount, due_date, status, receivable_type")
      .eq("member_id", id)
      .order("due_date", { ascending: true }),
    supabase
      .from("activity_logs")
      .select("id, action, entity_type, description, created_at")
      .eq("branch_id", profile.branch_id)
      .or(`entity_id.eq.${id},description.ilike.%member%`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!member) notFound();

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
