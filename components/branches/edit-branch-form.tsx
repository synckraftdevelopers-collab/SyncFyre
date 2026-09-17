"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { updateBranchAction } from "@/app/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditBranchFormProps = {
  branchId: string;
  defaultValues: {
    name: string;
    city: string;
    state: string;
    address: string;
    phone: string;
  };
};

/**
 * Edit an existing branch's display fields.
 * Uses updateBranchAction which is already implemented in settings-actions.ts.
 * Note: updateBranchAction updates the user's current branch (profile.branch_id).
 * For multi-branch admins editing a different branch, a dedicated action would be
 * needed — this form is shown on the detail page of the admin's current branch.
 */
export function EditBranchForm({ branchId: _branchId, defaultValues }: EditBranchFormProps) {
  const [state, action, pending] = useActionState(updateBranchAction, {});

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <label className="space-y-1.5 text-sm font-medium md:col-span-2">
        Branch name <span className="text-destructive">*</span>
        <Input name="name" defaultValue={defaultValues.name} required className="mt-1" />
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        City
        <Input name="city" defaultValue={defaultValues.city} className="mt-1" />
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        State
        <Input name="state" defaultValue={defaultValues.state} className="mt-1" />
      </label>
      <label className="space-y-1.5 text-sm font-medium md:col-span-2">
        Address
        <Input name="address" defaultValue={defaultValues.address} className="mt-1" />
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        Phone
        <Input name="phone" type="tel" defaultValue={defaultValues.phone} className="mt-1" />
      </label>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600 md:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 md:col-span-2">
          {state.success}
        </p>
      ) : null}

      <div>
        <Button disabled={pending} type="submit" variant="outline">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
