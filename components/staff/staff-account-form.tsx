"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStaffAccountAction } from "@/app/actions/staff-account-actions";

export function StaffAccountForm({ branches = [], roles = [], disabled = false }: { branches?: { id: string; name: string }[]; roles?: { id: string; name: string; slug: string }[]; disabled?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createStaffAccountAction, {});
  useEffect(() => { if (state.error) toast.error(state.error); if (state.success) { toast.success(state.success); router.push("/admin/staff"); } }, [router, state]);
  return <form action={action} className="grid gap-4 md:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Full name *<Input name="full_name" required disabled={disabled} /></label><label className="space-y-1.5 text-sm font-medium">Email *<Input name="email" type="email" required disabled={disabled} /></label><label className="space-y-1.5 text-sm font-medium">Temporary password *<Input name="password" type="password" minLength={8} required disabled={disabled} /><span className="block text-xs font-normal text-muted-foreground">At least 8 characters; share it securely with the staff member.</span></label><label className="space-y-1.5 text-sm font-medium">Role *<select name="role" defaultValue={roles[0]?.slug ?? "reception"} disabled={disabled} className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select role</option>{roles.map((role) => <option value={role.slug} key={role.id}>{role.name}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium">Branch *<select name="branch_id" required disabled={disabled} className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select branch</option>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium">Designation *<Input name="designation" defaultValue="Receptionist" required disabled={disabled} /></label><div className="md:col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button type="submit" disabled={pending || disabled}>{pending && <LoaderCircle className="size-4 animate-spin" />} Create staff account</Button></div></form>;
}
