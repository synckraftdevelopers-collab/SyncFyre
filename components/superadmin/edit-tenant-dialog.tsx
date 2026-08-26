"use client";

import { useActionState } from "react";
import { LoaderCircle, Pencil } from "lucide-react";
import { updateTenantAction } from "@/app/(superadmin)/superadmin/tenants/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type EditableTenant = {
  id: string;
  name: string;
  slug: string;
  owner_email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  tenant_type: string;
  purpose: string | null;
  plan: string;
  status: string;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  branch_id: string | null;
  branch_name: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  owner_phone: string | null;
};

const tenantTypeOptions = [
  { value: "customer", label: "Customer" },
  { value: "demo", label: "Demo" },
];

const planOptions = [
  { value: "trial", label: "Free Trial" },
  { value: "standard", label: "Standard" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
];

const statusOptions = [
  { value: "trial", label: "Trialing" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
];

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function EditTenantDialog({ tenant }: { tenant: EditableTenant }) {
  const [state, action, pending] = useActionState(updateTenantAction, {});

  return <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" size="sm"><Pencil className="size-4" />Edit</Button>
    </DialogTrigger>
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Edit Gym / Tenant</DialogTitle>
        <DialogDescription>Update gym, owner, branch, plan, and trial details from the existing SuperAdmin tenant screen.</DialogDescription>
      </DialogHeader>
      <form action={action} className="grid gap-4">
        <input type="hidden" name="tenant_id" value={tenant.id} />
        <input type="hidden" name="owner_user_id" value={tenant.owner_user_id ?? ""} />
        <input type="hidden" name="branch_id" value={tenant.branch_id ?? ""} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Gym name<Input name="gym_name" defaultValue={tenant.name} className="mt-1.5" required /></label>
          <label className="text-sm font-medium">Gym slug<Input name="gym_slug" defaultValue={tenant.slug} className="mt-1.5" required /></label>
          <label className="text-sm font-medium">Owner name<Input name="owner_name" defaultValue={tenant.owner_name ?? ""} className="mt-1.5" /></label>
          <label className="text-sm font-medium">Owner email<Input name="owner_email" type="email" defaultValue={tenant.owner_email ?? ""} className="mt-1.5" /></label>
          <label className="text-sm font-medium">Owner mobile<Input name="owner_phone" defaultValue={tenant.owner_phone ?? tenant.phone ?? ""} className="mt-1.5" /></label>
          <label className="text-sm font-medium">Main branch<Input name="branch_name" defaultValue={tenant.branch_name ?? "Main Branch"} className="mt-1.5" /></label>
          <label className="text-sm font-medium">City<Input name="city" defaultValue={tenant.city ?? ""} className="mt-1.5" /></label>
          <label className="text-sm font-medium">State<Input name="state" defaultValue={tenant.state ?? ""} className="mt-1.5" /></label>
          <label className="text-sm font-medium">Tenant type<select name="tenant_type" defaultValue={tenant.tenant_type} className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{tenantTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="text-sm font-medium">Purpose<Input name="purpose" defaultValue={tenant.purpose ?? ""} className="mt-1.5" placeholder="CLIENT DEMONSTRATION" /></label>
          <label className="text-sm font-medium">Plan<select name="plan" defaultValue={tenant.plan} className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{planOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="text-sm font-medium">Status<select name="status" defaultValue={tenant.status} className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="text-sm font-medium">Trial start<Input name="trial_starts_at" type="date" defaultValue={toDateInput(tenant.trial_starts_at)} className="mt-1.5" /></label>
          <label className="text-sm font-medium">Trial end<Input name="trial_ends_at" type="date" defaultValue={toDateInput(tenant.trial_ends_at)} className="mt-1.5" /></label>
        </div>
        {state.error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">{state.success}</p>}
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}Save changes</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
