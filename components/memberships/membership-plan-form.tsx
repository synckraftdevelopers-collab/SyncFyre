"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createMembershipPlanAction,
  updateMembershipPlanAction,
} from "@/app/actions/membership-plan-actions";

// Normalize features to a string[] regardless of what Supabase returns
function parseFeatures(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }
  return [];
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  gst_percent: number;
  discount_percent: number;
  features: string[];
  status: "active" | "inactive";
}

interface Props {
  branchId: string;
  plan?: Plan; // when editing
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-w-[120px]">
      {pending && <Loader2 className="size-4 animate-spin" />}
      {isEdit ? "Save Changes" : "Create Plan"}
    </Button>
  );
}

export function MembershipPlanForm({ branchId, plan }: Props) {
  const isEdit = !!plan;

  // Bind update action to this plan's id when editing
  const action = isEdit
    ? updateMembershipPlanAction.bind(null, plan.id)
    : createMembershipPlanAction;

  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="branch_id" value={branchId} />

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Plan name */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">
            Plan Name <span className="text-destructive">*</span>
          </label>
          <Input
            name="name"
            required
            placeholder="e.g. Monthly Premium, Annual Basic"
            defaultValue={plan?.name ?? ""}
          />
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Duration (months) <span className="text-destructive">*</span>
          </label>
          <Input
            name="duration_months"
            type="number"
            required
            min={1}
            max={24}
            placeholder="e.g. 1, 3, 6, 12"
            defaultValue={plan?.duration_months ?? ""}
          />
        </div>

        {/* Base price */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Base Price (₹) <span className="text-destructive">*</span>
          </label>
          <Input
            name="price"
            type="number"
            required
            min={0}
            step={0.01}
            placeholder="e.g. 1999"
            defaultValue={plan?.price ?? ""}
          />
        </div>

        {/* GST */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">GST (%)</label>
          <Input
            name="gst_percent"
            type="number"
            min={0}
            max={100}
            step={0.01}
            placeholder="18"
            defaultValue={plan?.gst_percent ?? 18}
          />
          <p className="text-xs text-muted-foreground">
            Standard gym GST rate is 18%
          </p>
        </div>

        {/* Discount */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Discount (%)</label>
          <Input
            name="discount_percent"
            type="number"
            min={0}
            max={100}
            step={0.01}
            placeholder="0"
            defaultValue={plan?.discount_percent ?? 0}
          />
        </div>

        {/* Features */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Features</label>
          <Input
            name="features"
            placeholder="e.g. Unlimited classes, Locker access, Personal trainer session"
            defaultValue={parseFeatures(plan?.features).join(", ") ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of features included in this plan
          </p>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Status</label>
          <select
            name="status"
            defaultValue={plan?.status ?? "active"}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Price preview */}
      <PricePreview />

      {/* Error */}
      {state.error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton isEdit={isEdit} />
        <Button
          type="button"
          variant="outline"
          onClick={() => history.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Live price preview — reads form values on the client
function PricePreview() {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Price Preview
      </p>
      <p className="text-xs text-muted-foreground">
        Fill in Base Price, GST %, and Discount % above to see the total member
        will pay. Calculation: (Price × (1 − Discount%)) + GST on discounted price.
      </p>
    </div>
  );
}
