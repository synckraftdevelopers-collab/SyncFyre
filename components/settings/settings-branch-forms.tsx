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
  state?: string | null;
}

interface FinanceData {
  gst_registered?: boolean | null;
  gstin: string | null;
  legal_business_name?: string | null;
  business_address?: string | null;
  business_city?: string | null;
  business_state?: string | null;
  business_state_code?: string | null;
  business_pincode?: string | null;
  default_gst_rate?: number | null;
  gst_pricing_mode?: string | null;
  fiscal_year_start_month: number | null;
}

export function SettingsBranchForms({ branch, finance, isAdmin }: { branch?: BranchData | null; finance?: FinanceData | null; isAdmin: boolean; }) {
  const [updateState, updateAction, updatePending] = useActionState<SettingsActionState, FormData>(updateBranchAction, {});
  const [createState, createAction, createPending] = useActionState<SettingsActionState, FormData>(createBranchAction, {});

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Branch and GST Settings</CardTitle>
          <p className="text-sm text-muted-foreground">These values drive Finance, GST, and invoice headers across the branch.</p>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Branch name *" defaultValue={branch?.name} required />
            <Field name="city" label="City" defaultValue={branch?.city} />
            <Field name="state" label="State" defaultValue={branch?.state ?? finance?.business_state ?? ""} />
            <Field name="phone" label="Phone" defaultValue={branch?.phone} />
            <Field name="legal_business_name" label="Business legal name" defaultValue={finance?.legal_business_name ?? branch?.name ?? ""} />
            <Field name="gstin" label="GSTIN" defaultValue={finance?.gstin} />
            <Field name="business_state_code" label="State code" defaultValue={finance?.business_state_code ?? ""} />
            <Field name="default_gst_rate" label="Default GST rate" defaultValue={String(finance?.default_gst_rate ?? 18)} type="number" />
            <Field name="address" label="Branch address" defaultValue={branch?.address} className="sm:col-span-2" />
            <Field name="business_address" label="Business address" defaultValue={finance?.business_address ?? branch?.address ?? ""} className="sm:col-span-2" />
            <Field name="business_city" label="Business city" defaultValue={finance?.business_city ?? branch?.city ?? ""} />
            <Field name="business_state" label="Business state" defaultValue={finance?.business_state ?? branch?.state ?? ""} />
            <Field name="business_pincode" label="Business pincode" defaultValue={finance?.business_pincode ?? ""} />
            <Field name="fiscal_year_start_month" label="Financial year start month" defaultValue={String(finance?.fiscal_year_start_month ?? 4)} type="number" />
            <label className="space-y-1">
              <span className="text-sm font-medium">GST enabled</span>
              <select name="gst_registered" defaultValue={finance?.gst_registered ? "true" : "false"} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">GST pricing mode</span>
              <select name="gst_pricing_mode" defaultValue={finance?.gst_pricing_mode ?? "exclusive"} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="exclusive">Exclusive</option>
                <option value="inclusive">Inclusive</option>
              </select>
            </label>

            {updateState.error ? <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">{updateState.error}</p> : null}
            {updateState.success ? <p className="sm:col-span-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{updateState.success}</p> : null}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={updatePending}>
                {updatePending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Save branch settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Create New Branch</CardTitle>
            <p className="text-sm text-muted-foreground">Add another branch with its own Finance and GST settings.</p>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Branch name *" required />
              <Field name="code" label="Branch code *" placeholder="e.g. BRANCH2" required />
              <Field name="city" label="City" />
              <Field name="state" label="State" />
              <Field name="phone" label="Phone" />
              <Field name="gstin" label="GSTIN" />
              <Field name="default_gst_rate" label="Default GST rate" defaultValue="18" type="number" />
              <Field name="fiscal_year_start_month" label="Financial year start month" defaultValue="4" type="number" />
              <Field name="address" label="Address" className="sm:col-span-2" />

              {createState.error ? <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">{createState.error}</p> : null}
              {createState.success ? <p className="sm:col-span-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{createState.success}</p> : null}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={createPending}>
                  {createPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  Create branch
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ name, label, defaultValue, required, type = "text", placeholder, className = "" }: { name: string; label: string; defaultValue?: string | null; required?: boolean; type?: string; placeholder?: string; className?: string; }) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      <Input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
    </label>
  );
}
