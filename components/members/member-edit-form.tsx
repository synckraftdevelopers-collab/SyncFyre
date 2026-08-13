"use client";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { updateMemberAction } from "@/app/actions/member-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Member } from "@/types";

const fieldClass = "space-y-1.5 text-sm font-medium";

export function MemberEditForm({
  member,
  branches,
  trainers,
  dieticians,
}: {
  member: Member & {
    address?: string | null;
    blood_group?: string | null;
    medical_conditions?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    assigned_dietician_id?: string | null;
    assigned_trainer_id?: string | null;
  };
  dieticians: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  trainers: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateMemberAction, {});

  return (
    <form action={action} className="space-y-7">
      {/* hidden ID so the action knows which record to update */}
      <input type="hidden" name="id" value={member.id} />

      <section>
        <h2 className="mb-4 font-semibold">Personal information</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className={fieldClass}>
            Full name *
            <Input name="full_name" required defaultValue={member.full_name} />
          </label>
          <label className={fieldClass}>
            Phone
            <Input name="phone" type="tel" defaultValue={member.phone ?? ""} />
          </label>
          <label className={fieldClass}>
            Email
            <Input name="email" type="email" defaultValue={member.email ?? ""} />
          </label>
          <label className={fieldClass}>
            Gender
            <select
              name="gender"
              defaultValue={member.gender ?? ""}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
          <label className={fieldClass}>
            Date of birth
            <Input name="date_of_birth" type="date" defaultValue={member.date_of_birth ?? ""} />
          </label>
          <label className={fieldClass}>
            Blood group
            <Input name="blood_group" placeholder="e.g. O+" defaultValue={member.blood_group ?? ""} />
          </label>
          <label className={`${fieldClass} md:col-span-2 xl:col-span-3`}>
            Address
            <Input name="address" defaultValue={member.address ?? ""} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-semibold">Health &amp; fitness</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className={fieldClass}>
            Height (cm)
            <Input name="height_cm" type="number" min="1" step="0.1" defaultValue={member.height_cm ?? ""} />
          </label>
          <label className={fieldClass}>
            Weight (kg)
            <Input name="weight_kg" type="number" min="1" step="0.1" defaultValue={member.weight_kg ?? ""} />
          </label>
          <label className={fieldClass}>
            Fitness goal
            <Input name="fitness_goal" defaultValue={member.fitness_goal ?? ""} />
          </label>
          <label className={`${fieldClass} md:col-span-2 xl:col-span-3`}>
            Medical conditions
            <Input
              name="medical_conditions"
              placeholder="Allergies, injuries, or relevant conditions"
              defaultValue={member.medical_conditions ?? ""}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-semibold">Status &amp; assignment</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className={fieldClass}>
            Emergency contact
            <Input name="emergency_contact_name" defaultValue={member.emergency_contact_name ?? ""} />
          </label>
          <label className={fieldClass}>
            Emergency phone
            <Input name="emergency_contact_phone" type="tel" defaultValue={member.emergency_contact_phone ?? ""} />
          </label>
          <label className={fieldClass}>
            Branch *
            <select
              name="branch_id"
              required
              defaultValue={member.branch_id}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
            >
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldClass}>
            Assigned trainer
            <select
              name="assigned_trainer_id"
              defaultValue={member.assigned_trainer_id ?? ""}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
            >
              <option value="">Not assigned</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldClass}>
            Assigned dietician
            <select name="assigned_dietician_id" defaultValue={member.assigned_dietician_id ?? ""} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3">
              <option value="">Not assigned</option>
              {dieticians.map((dietician) => <option key={dietician.id} value={dietician.id}>{dietician.name}</option>)}
            </select>
          </label>
          <label className={fieldClass}>
            Status
            <select
              name="status"
              defaultValue={member.status}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </section>

      {state.error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
          {state.error}
          {state.fields && (
            <ul className="mt-1 list-inside list-disc">
              {Object.entries(state.fields).map(([key, messages]) => (
                <li key={key}>
                  {key}: {messages[0]}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button disabled={pending}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
