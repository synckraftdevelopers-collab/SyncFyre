"use client";

import { useActionState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { createGymAdminAction } from "@/app/(superadmin)/superadmin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateGymAdminForm() {
  const [state, action, pending] = useActionState(createGymAdminAction, {});
  return <form action={action} className="grid gap-4 md:grid-cols-2">
    <label className="text-sm font-medium">Gym name<Input name="gym_name" className="mt-1.5" placeholder="Example Fitness" required /></label>
    <label className="text-sm font-medium">Gym slug<Input name="gym_slug" className="mt-1.5" placeholder="example-fitness" /></label>
    <label className="text-sm font-medium">Owner name<Input name="owner_name" className="mt-1.5" placeholder="Full name" required /></label>
    <label className="text-sm font-medium">Owner email<Input name="email" type="email" className="mt-1.5" placeholder="owner@example.com" required /></label>
    <label className="text-sm font-medium">Owner mobile<Input name="owner_phone" className="mt-1.5" placeholder="+91 98xxxxxxx" /></label>
    <label className="text-sm font-medium">Initial branch<Input name="branch_name" className="mt-1.5" defaultValue="Main Branch" /></label>
    <label className="text-sm font-medium md:col-span-2">Temporary password<Input name="password" type="password" minLength={8} autoComplete="new-password" className="mt-1.5" placeholder="At least 8 characters" required /></label>
    {state.error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 md:col-span-2">{state.error}</p>}
    {state.success && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 md:col-span-2">{state.success}</p>}
    <div className="md:col-span-2 text-xs text-muted-foreground">This creates the gym tenant, its main branch, the owner account, a 1-year free trial, and onboarding progress.</div>
    <div className="md:col-span-2"><Button disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} Create gym and owner</Button></div>
  </form>;
}
