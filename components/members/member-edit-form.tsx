"use client";
import { Fragment, useActionState, useState } from "react";
import { LoaderCircle, PlusCircle, Pencil, Trash2, X } from "lucide-react";
import { updateMemberAction } from "@/app/actions/member-actions";
import { AddMemberPlanForm } from "@/components/members/add-member-plan-form";
import { ChangeCouplePartnerForm } from "@/components/members/change-couple-partner-form";
import { EditSubscriptionForm } from "@/components/members/edit-subscription-form";
import { MemberDynamicFields } from "@/components/members/member-dynamic-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { MemberFormFieldConfiguration, MemberFormFieldKey } from "@/lib/members/member-form-config";
import type { Member } from "@/types";

const fieldClass = "space-y-1.5 text-sm font-medium";

type EditFormSubscription = {
  id: string;
  plan_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  total_amount: number;
};

function formatPlanDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

type MemberOption = { id: string; full_name: string; member_code: string };
type PlanOption = { id: string; name: string; price: number; duration_months: number; plan_type?: "individual" | "couple" };
type CouplePlanRow = {
  subscriptionId: string;
  isPrimary: boolean;
  partnerMemberId: string | null;
  partnerMemberName: string | null;
};

function subscriptionRowId(item: EditFormSubscription): string {
  return (item as unknown as { subscription_id?: string }).subscription_id ?? item.id;
}

export function MemberEditForm({
  member,
  branches,
  trainers,
  dieticians,
  memberFormFields,
  subscriptions = [],
  plans = [],
  members = [],
  couplePlanInfo = [],
  basePath = "/admin/members",
}: {
  member: Member & {
    address?: string | null;
    blood_group?: string | null;
    medical_conditions?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    machine_user_id?: string | null;
    assigned_dietician_id?: string | null;
    assigned_trainer_id?: string | null;
    age?: number | null;
    candidate_consent_name?: string | null;
    relationship_to_candidate?: string | null;
    screening_date?: string | null;
    screening_valid_until?: string | null;
  };
  memberFormFields: MemberFormFieldConfiguration[];
  dieticians: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  trainers: { id: string; name: string }[];
  subscriptions?: EditFormSubscription[];
  plans?: PlanOption[];
  members?: MemberOption[];
  couplePlanInfo?: CouplePlanRow[];
  basePath?: string;
}) {
  const [state, action, pending] = useActionState(updateMemberAction, {});
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingRow, setEditingRow] = useState<{ id: string; tab: string } | null>(null);
  const [changePartnerFor, setChangePartnerFor] = useState<string | null>(null);

  function openTab(rowId: string, tab: string) {
    setEditingRow((current) =>
      current?.id === rowId && current?.tab === tab ? null : { id: rowId, tab },
    );
  }
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const couplePlanById = new Map(couplePlanInfo.map((row) => [row.subscriptionId, row]));
  const enabledFields = memberFormFields.filter((field) => field.enabled);
  const values = member as Partial<Record<MemberFormFieldKey, string | number | null | undefined>>;
  const errors = state.fields ? Object.fromEntries(Object.entries(state.fields).map(([key, messages]) => [key, messages?.[0]])) as Partial<Record<MemberFormFieldKey, string>> : undefined;
  void basePath;

  return (
    <div className="space-y-7">
      <form action={action} className="space-y-7">
        <input type="hidden" name="id" value={member.id} />

        <section>
          <h2 className="mb-4 font-semibold">Personal information</h2>
          <MemberDynamicFields fields={enabledFields.filter((field) => field.section === "personal")} values={values} errors={errors} register={(name) => ({ name, defaultValue: values[name] == null ? "" : String(values[name]) })} />
        </section>

        <section>
          <h2 className="mb-4 font-semibold">Emergency information</h2>
          <MemberDynamicFields fields={enabledFields.filter((field) => field.section === "emergency")} values={values} errors={errors} register={(name) => ({ name, defaultValue: values[name] == null ? "" : String(values[name]) })} />
        </section>

        <section>
          <h2 className="mb-4 font-semibold">Health & fitness</h2>
          <MemberDynamicFields fields={enabledFields.filter((field) => field.section === "medical")} values={values} errors={errors} register={(name) => ({ name, defaultValue: values[name] == null ? "" : String(values[name]) })} />
        </section>

        <section>
          <h2 className="mb-4 font-semibold">Status, biometric & assignment</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className={fieldClass}>Branch *<select name="branch_id" required defaultValue={member.branch_id} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"><option value="">Select branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label className={fieldClass}>Biometric user ID<Input name="machine_user_id" defaultValue={member.machine_user_id ?? ""} placeholder="Used by face/fingerprint devices" /></label>
            <label className={fieldClass}>Assigned trainer<select name="assigned_trainer_id" defaultValue={member.assigned_trainer_id ?? ""} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"><option value="">Not assigned</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label className={fieldClass}>Assigned dietician<select name="assigned_dietician_id" defaultValue={member.assigned_dietician_id ?? ""} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"><option value="">Not assigned</option>{dieticians.map((dietician) => <option key={dietician.id} value={dietician.id}>{dietician.name}</option>)}</select></label>
            <label className={fieldClass}>Status<select name="status" defaultValue={member.status} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          </div>
        </section>

        {state.error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            {state.error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
          <Button disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}Save changes</Button>
        </div>
      </form>

      {/* Kept as a sibling, not nested inside the form above — the Add Plan
          panel below is its own <form> (server action), and HTML doesn't
          allow a <form> inside another <form>. */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Memberships</h2>
            <p className="text-sm text-muted-foreground">
              {activeSubscriptions.length > 1
                ? `${activeSubscriptions.length} plans are active at the same time — each runs on its own dates and balance.`
                : "A member can hold more than one plan at once — adding a plan never replaces one they already have."}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAddPlan((current) => !current)}>
            <PlusCircle className="size-4" />
            {showAddPlan ? "Close" : "Add Plan"}
          </Button>
        </div>

        {showAddPlan ? (
          <div className="mb-4">
            <AddMemberPlanForm memberId={member.id} memberName={member.full_name} plans={plans} members={members} onDone={() => setShowAddPlan(false)} />
          </div>
        ) : null}

        {subscriptions.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Start</th>
                  <th className="px-3 py-2 font-medium">Expiry</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subscriptions.map((item, idx) => {
                  const rowId = subscriptionRowId(item) || String(idx);
                  const couple = couplePlanById.get(rowId);
                  const isOpen = editingRow?.id === rowId;
                  const isActive = item.status === "active";
                  const isPaused = item.status === "paused";

                  return (
                    <Fragment key={rowId}>
                      <tr className={isOpen ? "bg-muted/20" : undefined}>
                        <td className="px-3 py-2">
                          {item.plan_name ?? "-"}
                          {couple ? (
                            <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                              {couple.partnerMemberName
                                ? `Paired with ${couple.partnerMemberName}`
                                : "Couple plan — no partner on record"}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{formatPlanDate(item.start_date)}</td>
                        <td className="px-3 py-2">{formatPlanDate(item.end_date)}</td>
                        <td className="px-3 py-2 capitalize">{item.status}</td>
                        <td className="px-3 py-2">
                          {formatCurrency(item.total_amount)}
                          {couple && couple.isPrimary ? (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="ml-2 h-auto p-0 text-xs"
                              onClick={() =>
                                setChangePartnerFor((current) =>
                                  current === rowId ? null : rowId,
                                )
                              }
                            >
                              {changePartnerFor === rowId ? "Close" : "Change partner"}
                            </Button>
                          ) : null}
                        </td>

                        {/* ── Action buttons ── */}
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1">

                            {/* Edit — opens the full panel (dates, amount, duration,
                                freeze/hold, extend, change plan). Freeze/Hold and
                                Change plan live as tabs inside that panel rather
                                than as separate row buttons — see EditSubscriptionForm. */}
                            {isActive || isPaused ? (
                              <Button
                                type="button"
                                variant={isOpen && editingRow?.tab !== "delete" ? "default" : "outline"}
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() => openTab(rowId, "edit")}
                                title="Edit dates, amount, duration, freeze/hold, change plan"
                              >
                                <Pencil className="size-3" />
                                {isOpen && editingRow?.tab !== "delete" ? "Close" : "Edit"}
                              </Button>
                            ) : null}

                            {/* Cancel plan */}
                            <Button
                              type="button"
                              variant={isOpen && editingRow?.tab === "delete" ? "destructive" : "ghost"}
                              size="sm"
                              className={`h-7 gap-1 px-2 text-xs ${isOpen && editingRow?.tab === "delete" ? "" : "text-destructive hover:bg-destructive/10 hover:text-destructive"}`}
                              onClick={() => openTab(rowId, "delete")}
                            >
                              <Trash2 className="size-3" />
                              {isOpen && editingRow?.tab === "delete" ? "Close" : "Cancel"}
                            </Button>

                            {/* Close button when any panel is open */}
                            {isOpen ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-1.5 text-muted-foreground"
                                onClick={() => setEditingRow(null)}
                                aria-label="Close panel"
                              >
                                <X className="size-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {/* Inline action panel */}
                      {isOpen ? (
                        <tr>
                          <td colSpan={6} className="px-3 pb-3 pt-1">
                            <EditSubscriptionForm
                              subscriptionId={rowId}
                              currentStartDate={item.start_date}
                              currentEndDate={item.end_date}
                              currentTotalAmount={item.total_amount}
                              currentStatus={item.status}
                              memberName={member.full_name ?? "Member"}
                              initialTab={editingRow?.tab as "edit" | "duration" | "freeze" | "extend" | "change_plan" | "delete" | undefined}
                              availablePlans={plans.filter(
                                (p) =>
                                  p.plan_type !== "couple" &&
                                  !subscriptions.some(
                                    (s) =>
                                      s.status === "active" &&
                                      (s as unknown as { plan_id?: string }).plan_id === p.id,
                                  ),
                              )}
                              onDone={() => setEditingRow(null)}
                            />
                          </td>
                        </tr>
                      ) : null}

                      {/* Couple partner change row */}
                      {couple && couple.isPrimary && changePartnerFor === rowId ? (
                        <tr>
                          <td colSpan={6} className="px-3 pb-3">
                            <ChangeCouplePartnerForm
                              subscriptionId={rowId}
                              excludeMemberIds={[member.id, couple.partnerMemberId ?? ""].filter(Boolean)}
                              members={members}
                              onDone={() => setChangePartnerFor(null)}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No plans yet — use Add Plan to sell this member their first one.
          </p>
        )}
      </section>
    </div>
  );
}
