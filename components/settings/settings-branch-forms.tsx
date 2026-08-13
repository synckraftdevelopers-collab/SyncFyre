"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateBranchAction,
  createBranchAction,
  type SettingsActionState,
} from "@/app/actions/settings-actions";

interface BranchData {
  id: string;
  name: string | null;
  code: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  status: string;
}

interface FinanceData {
  gstin: string | null;
  fiscal_year_start_month: number | null;
}

export function SettingsBranchForms({
  branch,
  finance,
  isAdmin,
}: {
  branch?: BranchData | null;
  finance?: FinanceData | null;
  isAdmin: boolean;
}) {
  const [updateState, updateAction, updatePending] = useActionState<SettingsActionState, FormData>(
    updateBranchAction,
    {},
  );
  const [createState, createAction, createPending] = useActionState<SettingsActionState, FormData>(
    createBranchAction,
    {},
  );

  return (
    <div className="space-y-5">
      {/* ── Edit current branch ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Information</CardTitle>
          <p className="text-sm text-muted-foreground">
            Updates apply immediately across the app.
          </p>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="grid gap-4 sm:grid-cols-2">
            <Field name="name"    label="Branch name *" defaultValue={branch?.name}    required />
            <Field name="city"    label="City"          defaultValue={branch?.city} />
            <Field name="phone"   label="Phone"         defaultValue={branch?.phone} />
            <Field name="gstin"   label="GSTIN"         defaultValue={finance?.gstin} />
            <Field
              name="address"
              label="Address"
              defaultValue={branch?.address}
              className="sm:col-span-2"
            />
            <Field
              name="fiscal_year_start_month"
              label="Financial year start month"
              defaultValue={String(finance?.fiscal_year_start_month ?? 4)}
              type="number"
            />

            {updateState.error && (
              <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {updateState.error}
              </p>
            )}
            {updateState.success && (
              <p className="sm:col-span-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                ✓ {updateState.success}
              </p>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={updatePending}>
                {updatePending && <LoaderCircle className="size-4 animate-spin" />}
                Save branch settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Create new branch (admin only) ──────────────────────── */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Branch</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add a second gym location. Staff and members can then be assigned to it.
            </p>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Branch name *" required />
              <Field
                name="code"
                label="Branch code *"
                placeholder="e.g. BRANCH2 (uppercase, no spaces)"
                required
              />
              <Field name="city"  label="City" />
              <Field name="phone" label="Phone" />
              <Field name="gstin" label="GSTIN" />
              <Field
                name="fiscal_year_start_month"
                label="Financial year start month"
                defaultValue="4"
                type="number"
              />
              <Field name="address" label="Address" className="sm:col-span-2" />

              {createState.error && (
                <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {createState.error}
                </p>
              )}
              {createState.success && (
                <p className="sm:col-span-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                  ✓ {createState.success}
                </p>
              )}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={createPending}>
                  {createPending && <LoaderCircle className="size-4 animate-spin" />}
                  Create branch
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Reusable field ───────────────────────────────────────────────────────────
function Field({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  placeholder,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      <Input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </label>
  );
}
