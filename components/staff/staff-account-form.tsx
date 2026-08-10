"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStaffAccountAction } from "@/app/actions/staff-account-actions";

export function StaffAccountForm({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createStaffAccountAction, {});
  useEffect(() => { if (state.error) toast.error(state.error); if (state.success) { toast.success(state.success); router.push("/admin/staff"); } }, [router, state]);
  return <form action={action} className="grid gap-4 md:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Full name *<Input name="full_name" required /></label><label className="space-y-1.5 text-sm font-medium">Email *<Input name="email" type="email" required /></label><label className="space-y-1.5 text-sm font-medium">Temporary password *<Input name="password" type="password" minLength={8} required /><span className="block text-xs font-normal text-muted-foreground">At least 8 characters; share it securely with the staff member.</span></label><label className="space-y-1.5 text-sm font-medium">Role *<select name="role" defaultValue="reception" className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="reception">Reception</option><option value="trainer">Trainer</option><option value="dietician">Dietician</option><option value="manager">Manager</option></select></label><label className="space-y-1.5 text-sm font-medium">Branch *<select name="branch_id" required className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select branch</option>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium">Designation *<Input name="designation" defaultValue="Receptionist" required /></label><div className="md:col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />} Create staff account</Button></div></form>;
}
