"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStaffAccountAction } from "@/app/actions/staff-account-actions";

interface Props {
  branches: { id: string; name: string }[];
  defaultBranchId: string;
  hasServiceKey: boolean;
}

export function AddTrainerForm({ branches, defaultBranchId, hasServiceKey }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createStaffAccountAction, {});

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      router.push("/admin/trainers");
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fieldClass = "space-y-1.5 text-sm font-medium";

  if (!hasServiceKey) {
    return (
      <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
        <p className="font-medium">Setup required</p>
        <p className="mt-1">
          Add <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> to create trainer accounts.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {/* Role is always trainer */}
      <input type="hidden" name="role" value="trainer" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldClass}>
          Full name *
          <Input
            name="full_name"
            required
            placeholder="e.g. Rahul Sharma"
            autoComplete="off"
            className="mt-1.5"
          />
        </label>

        <label className={fieldClass}>
          Email *
          <Input
            name="email"
            type="email"
            required
            placeholder="trainer@yourgym.com"
            autoComplete="new-password"
            className="mt-1.5"
          />
        </label>

        <label className={fieldClass}>
          Password *
          <Input
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground">Trainer will use this to log in.</p>
        </label>

        <label className={fieldClass}>
          Designation *
          <Input
            name="designation"
            required
            defaultValue="Trainer"
            placeholder="e.g. Head Trainer, Fitness Coach"
            className="mt-1.5"
          />
        </label>

        <label className={`${fieldClass} sm:col-span-2`}>
          Branch *
          <select
            name="branch_id"
            required
            defaultValue={defaultBranchId}
            className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          Create trainer
        </Button>
      </div>
    </form>
  );
}
