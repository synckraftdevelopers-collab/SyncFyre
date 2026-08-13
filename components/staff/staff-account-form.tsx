"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStaffAccountAction } from "@/app/actions/staff-account-actions";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  reception: "Can register members, collect payments, and manage appointments for their branch.",
  trainer:   "Can view assigned members, log workouts, diet plans, and progress for their branch.",
  dietician: "Can view assigned members and manage diet plans for their branch.",
  manager:   "Full access to branch operations and reports. Cannot manage other admins.",
};

export function StaffAccountForm({
  branches = [],
  roles = [],
  disabled = false,
}: {
  branches?: { id: string; name: string }[];
  roles?: { id: string; name: string; slug: string }[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createStaffAccountAction, {});

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success(state.success);
      router.push("/admin/staff");
    }
  }, [router, state]);

  return (
    <form action={action} className="space-y-6" autoComplete="off">

      {/* Personal details */}
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Staff details
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Full name *
            <Input
              name="full_name"
              required
              disabled={disabled}
              placeholder="e.g. Rahul Sharma"
              autoComplete="off"
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Email *
            <Input
              name="email"
              type="email"
              required
              disabled={disabled}
              placeholder="staff@yourgym.com"
              autoComplete="new-password"   /* prevents browser autofill */
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Temporary password *
            <Input
              name="password"
              type="password"
              minLength={8}
              required
              disabled={disabled}
              placeholder="Min. 8 characters"
              autoComplete="new-password"   /* prevents browser autofill */
            />
            <span className="block text-xs font-normal text-muted-foreground">
              Share this securely. Staff should change it on first login.
            </span>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Designation *
            <Input
              name="designation"
              required
              disabled={disabled}
              placeholder="e.g. Receptionist, Head Trainer"
            />
          </label>
        </div>
      </div>

      {/* Branch + Role assignment */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Branch &amp; Role assignment</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          The staff member will only be able to see and manage data from the branch you assign.
          Their role controls what actions they can perform.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Branch *
            <select
              name="branch_id"
              required
              disabled={disabled}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">— Select branch —</option>
              {branches.map((branch) => (
                <option value={branch.id} key={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Role *
            <select
              name="role"
              required
              disabled={disabled}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">— Select role —</option>
              {roles.map((role) => (
                <option value={role.slug} key={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Role permission summary */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-start gap-2 rounded-lg border bg-background p-3 text-xs"
            >
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="font-semibold">{role.name}</p>
                <p className="text-muted-foreground leading-relaxed">
                  {ROLE_DESCRIPTIONS[role.slug] ?? "Access limited to assigned branch."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Access summary preview */}
      <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">What happens after creation:</p>
        <ul className="space-y-1 list-inside list-disc">
          <li>A login account is created with the email and temporary password above.</li>
          <li>The staff member is assigned to the selected branch — they will only see that branch&apos;s data.</li>
          <li>Their role determines which portal they land on after login and what they can do.</li>
          <li>You can reassign their branch or deactivate their account from the Staff list.</li>
        </ul>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || disabled}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          Create staff account
        </Button>
      </div>
    </form>
  );
}
