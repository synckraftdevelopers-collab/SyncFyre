"use client";
import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle, PlusCircle } from "lucide-react";
import { updateMemberAction } from "@/app/actions/member-actions";
import { MemberDynamicFields } from "@/components/members/member-dynamic-fields";
import { Button, buttonVariants } from "@/components/ui/button";
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

export function MemberEditForm({
  member,
  branches,
  trainers,
  dieticians,
  memberFormFields,
  subscriptions = [],
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
  basePath?: string;
}) {
  const [state, action, pending] = useActionState(updateMemberAction, {});
  // Same "Add Plan" flow as the member's profile page — picks the plan
  // (couple plans included, with their existing partner picker) and creates
  // a brand new, separate subscription without touching any plan the
  // member already has.
  const isReceptionPortal = basePath.startsWith("/reception");
  const addPlanHref = isReceptionPortal
    ? `/reception/memberships/new?member=${member.id}`
    : `/admin/subscriptions/new?member=${member.id}&returnTo=${encodeURIComponent(`${basePath}/${member.id}?edit=1`)}`;
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const enabledFields = memberFormFields.filter((field) => field.enabled);
  const values = member as Partial<Record<MemberFormFieldKey, string | number | null | undefined>>;
  const errors = state.fields ? Object.fromEntries(Object.entries(state.fields).map(([key, messages]) => [key, messages?.[0]])) as Partial<Record<MemberFormFieldKey, string>> : undefined;

  return (
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
          <Link href={addPlanHref} className={buttonVariants({ variant: "outline", size: "sm" })}><PlusCircle className="size-4" />Add Plan</Link>
        </div>
        {subscriptions.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2 font-medium">Plan</th><th className="px-3 py-2 font-medium">Start</th><th className="px-3 py-2 font-medium">Expiry</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Total</th></tr>
              </thead>
              <tbody className="divide-y">
                {subscriptions.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">{item.plan_name ?? "-"}</td>
                    <td className="px-3 py-2">{formatPlanDate(item.start_date)}</td>
                    <td className="px-3 py-2">{formatPlanDate(item.end_date)}</td>
                    <td className="px-3 py-2 capitalize">{item.status}</td>
                    <td className="px-3 py-2">{formatCurrency(item.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No plans yet — use Add Plan to sell this member their first one.</p>
        )}
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
  );
}
