import { format, parseISO } from "date-fns";
import { Bell } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  DaysRemainingBadge,
  SubscriptionStatusBadge,
  PaymentStatusBadge,
  AttendanceTodayBadge,
} from "@/components/members/member-badges";
import { RenewMembershipDialog } from "@/components/members/renew-membership-dialog";
import {
  getMemberById,
  getMemberSubscriptions,
  getMemberPayments,
  getMemberAttendanceSummary,
} from "@/services/member-extended.service";

// ─── Personal tab ────────────────────────────────────────────────────────────
export function PersonalTab({
  member,
  age,
  bmi,
}: {
  member: Awaited<ReturnType<typeof getMemberById>>;
  age: number | null;
  bmi: number | null;
}) {
  if (!member) return null;
  const sections = [
    {
      title: "Basic Details",
      rows: [
        ["Full name", member.full_name],
        ["Gender", member.gender ?? "—"],
        [
          "Date of birth",
          member.date_of_birth
            ? format(parseISO(member.date_of_birth), "dd MMM yyyy")
            : "—",
        ],
        ["Age", age ? `${age} years` : "—"],
        ["Phone", member.phone],
        ["Email", member.email ?? "—"],
        ["Address", member.address ?? "—"],
      ],
    },
    {
      title: "Health & Fitness",
      rows: [
        ["Height", member.height_cm ? `${member.height_cm} cm` : "—"],
        ["Weight", member.weight_kg ? `${member.weight_kg} kg` : "—"],
        ["BMI", bmi ? String(bmi) : "—"],
        ["Blood group", member.blood_group ?? "—"],
        ["Fitness goal", member.fitness_goal ?? "—"],
        ["Medical conditions", member.medical_conditions ?? "—"],
      ],
    },
    {
      title: "Emergency Contact",
      rows: [
        ["Contact name", member.emergency_contact_name ?? "—"],
        ["Contact phone", member.emergency_contact_phone ?? "—"],
      ],
    },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {sections.map((s) => (
        <div key={s.title}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {s.title}
          </p>
          <dl className="space-y-2">
            {s.rows.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-2 text-sm border-b pb-1.5 last:border-0"
              >
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
export function MembershipTab({
  subscriptions,
  plans,
  memberId,
  branchId,
}: {
  subscriptions: Awaited<ReturnType<typeof getMemberSubscriptions>>;
  plans: {
    id: string;
    name: string;
    price: number;
    gst_percent: number;
    discount_percent: number;
    duration_months: number;
  }[];
  memberId: string;
  branchId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Subscription History</h3>
        <RenewMembershipDialog
          memberId={memberId}
          branchId={branchId}
          plans={plans}
        />
      </div>
      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No subscriptions yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                {[
                  "Plan",
                  "Start",
                  "End",
                  "Days Left",
                  "Status",
                  "Amount",
                  "GST",
                  "Total",
                  "Renewals",
                ].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscriptions.map((s) => {
                const daysLeft = Math.floor(
                  (new Date(s.end_date).getTime() - Date.now()) / 86400000
                );
                return (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="py-2.5 pr-4 font-medium">{s.plan_name}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {format(parseISO(s.start_date), "dd MMM yyyy")}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {format(parseISO(s.end_date), "dd MMM yyyy")}
                    </td>
                    <td className="py-2.5 pr-4">
                      <DaysRemainingBadge days={daysLeft} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <SubscriptionStatusBadge status={s.status} />
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {formatCurrency(s.price)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                      {formatCurrency(s.gst_amount)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums font-semibold">
                      {formatCurrency(s.total_amount)}
                    </td>
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
export function PaymentsTab({
  payments,
}: {
  payments: Awaited<ReturnType<typeof getMemberPayments>>;
}) {
  const totalPaid = payments
    .filter((p) => p.payment_status === "completed")
    .reduce((s, p) => s + Number(p.net_amount), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3 text-sm">
          <p className="text-muted-foreground">Total paid</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-600">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="rounded-xl border p-3 text-sm">
          <p className="text-muted-foreground">Transactions</p>
          <p className="mt-0.5 text-lg font-bold">{payments.length}</p>
        </div>
      </div>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No payments yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                {["Date", "Invoice", "Plan", "Amount", "Method", "Status", "Ref", "By"].map(
                  (h) => (
                    <th key={h} className="pb-2 pr-4 font-medium">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.payment_id} className="hover:bg-muted/20">
                  <td className="py-2.5 pr-4 whitespace-nowrap">
                    {format(parseISO(p.payment_date), "dd MMM yyyy")}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs">
                    {p.invoice_number ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4">{p.plan_name ?? "Direct"}</td>
                  <td className="py-2.5 pr-4 tabular-nums font-medium">
                    {formatCurrency(p.net_amount)}
                  </td>
                  <td className="py-2.5 pr-4 capitalize">{p.payment_method}</td>
                  <td className="py-2.5 pr-4">
                    <PaymentStatusBadge status={p.payment_status} />
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                    {p.transaction_reference ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {p.collected_by ?? "—"}
                  </td>
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
export function AttendanceTab({
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
          <div className="mt-1">
            <AttendanceTodayBadge present={summary.todayPresent} />
          </div>
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
      <p className="text-xs text-muted-foreground italic">
        Attendance is recorded automatically by face machine. Manual edits are not allowed.
      </p>
      {records.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                {["Date", "Entry", "Exit", "Duration"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((r) => (
                <tr key={r.attendance_id} className="hover:bg-muted/20">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {format(parseISO(r.attendance_date), "dd MMM yyyy")}
                  </td>
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
export function ProgressTab({ records }: { records: any[] }) {
  if (!records.length)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No progress records yet.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            {[
              "Date",
              "Weight",
              "BMI",
              "Body Fat %",
              "Waist",
              "Chest",
              "Arms",
              "Legs",
              "Notes",
            ].map((h) => (
              <th key={h} className="pb-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-muted/20">
              <td className="py-2 pr-4 whitespace-nowrap">
                {format(parseISO(r.measured_at), "dd MMM yyyy")}
              </td>
              <td className="py-2 pr-4">{r.weight_kg ?? "—"}</td>
              <td className="py-2 pr-4">{r.bmi ?? "—"}</td>
              <td className="py-2 pr-4">
                {r.body_fat_percent != null ? `${r.body_fat_percent}%` : "—"}
              </td>
              <td className="py-2 pr-4">{r.waist_cm ?? "—"}</td>
              <td className="py-2 pr-4">{r.chest_cm ?? "—"}</td>
              <td className="py-2 pr-4">{r.arms_cm ?? "—"}</td>
              <td className="py-2 pr-4">{r.legs_cm ?? "—"}</td>
              <td className="py-2 pr-4 text-muted-foreground max-w-[160px] truncate">
                {r.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Workouts tab ─────────────────────────────────────────────────────────────
export function WorkoutsTab({ workouts }: { workouts: any[] }) {
  if (!workouts.length)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No active workouts.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            {[
              "Name",
              "Exercise",
              "Sets",
              "Reps",
              "Weight",
              "Cardio",
              "Scheduled",
              "Notes",
            ].map((h) => (
              <th key={h} className="pb-2 pr-4 font-medium">
                {h}
              </th>
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
              <td className="py-2 pr-4">
                {w.weight_kg ? `${w.weight_kg} kg` : "—"}
              </td>
              <td className="py-2 pr-4">
                {w.cardio_minutes ? `${w.cardio_minutes} min` : "—"}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {w.scheduled_date
                  ? format(parseISO(w.scheduled_date), "dd MMM")
                  : "—"}
              </td>
              <td className="py-2 pr-4 max-w-[140px] truncate text-muted-foreground">
                {w.trainer_notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Diet tab ─────────────────────────────────────────────────────────────────
export function DietTab({ plans }: { plans: any[] }) {
  if (!plans.length)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No active diet plans.
      </p>
    );
  return (
    <div className="space-y-4">
      {plans.map((p) => (
        <div key={p.id} className="rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">{p.name}</h4>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(p.start_date), "dd MMM yyyy")}
              {p.end_date
                ? ` – ${format(parseISO(p.end_date), "dd MMM yyyy")}`
                : " (ongoing)"}
            </span>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Breakfast", p.breakfast],
              ["Lunch", p.lunch],
              ["Dinner", p.dinner],
              ["Snacks", p.snacks],
            ].map(([label, val]) =>
              val ? (
                <div key={label as string}>
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p>{val}</p>
                </div>
              ) : null
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
export function NotificationsTab({ items }: { items: any[] }) {
  if (!items.length)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No notifications.
      </p>
    );
  return (
    <div className="space-y-2">
      {items.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 rounded-xl border p-3.5 ${
            !n.read_at ? "bg-primary/3 border-primary/20" : ""
          }`}
        >
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
