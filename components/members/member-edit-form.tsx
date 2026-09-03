"use client";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { updateMemberAction } from "@/app/actions/member-actions";
import { MemberDynamicFields } from "@/components/members/member-dynamic-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MemberFormFieldConfiguration, MemberFormFieldKey } from "@/lib/members/member-form-config";
import type { Member } from "@/types";

const fieldClass = "space-y-1.5 text-sm font-medium";

export function MemberEditForm({
  member,
  branches,
  trainers,
  dieticians,
  memberFormFields,
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
}) {
  const [state, action, pending] = useActionState(updateMemberAction, {});
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
