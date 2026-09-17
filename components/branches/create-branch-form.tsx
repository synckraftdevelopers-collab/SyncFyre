"use client";

import { useActionState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { createBranchAction } from "@/app/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateBranchForm() {
  const [state, action, pending] = useActionState(createBranchAction, {});

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <label className="space-y-1.5 text-sm font-medium">
        Branch name <span className="text-destructive">*</span>
        <Input name="name" placeholder="e.g. South Mumbai Branch" required className="mt-1" />
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        Branch code <span className="text-destructive">*</span>
        <Input
          name="code"
          placeholder="e.g. SOUTH-MUM"
          required
          className="mt-1 font-mono uppercase"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
          }}
        />
        <p className="text-xs text-muted-foreground">2–20 uppercase letters, numbers, hyphens, or underscores.</p>
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        City
        <Input name="city" placeholder="Mumbai" className="mt-1" />
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        State
        <Input name="state" placeholder="Maharashtra" className="mt-1" />
      </label>
      <label className="space-y-1.5 text-sm font-medium md:col-span-2">
        Address
        <Input name="address" placeholder="123 Main St, Bandra" className="mt-1" />
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        Phone
        <Input name="phone" type="tel" placeholder="+91 98XXXXXXXX" className="mt-1" />
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

      <div className="md:col-span-2">
        <Button disabled={pending} type="submit">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Create Branch
        </Button>
      </div>
    </form>
  );
}
