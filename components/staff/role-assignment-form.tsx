"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assignStaffRoleAction } from "@/app/actions/staff-role-actions";

type User = { id: string; full_name: string; email: string | null };
type Option = { id: string; name: string };

export function RoleAssignmentForm({ users, roles, branches }: { users: User[]; roles: Option[]; branches: Option[] }) {
  const [state, action, pending] = useActionState(assignStaffRoleAction, {});
  useEffect(() => { if (state.error) toast.error(state.error); if (state.success) toast.success(state.success); }, [state]);
  return <form action={action} className="grid gap-4 md:grid-cols-2"><label className="space-y-1.5 text-sm font-medium md:col-span-2">Existing login account *<select name="user_id" required className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select user</option>{users.map((user) => <option value={user.id} key={user.id}>{user.full_name || "Unnamed user"}{user.email ? ` (${user.email})` : ""}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium">Role *<select name="role_id" required className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select role</option>{roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium">Branch *<select name="branch_id" required className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select branch</option>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label><p className="md:col-span-2 text-sm text-muted-foreground">A Reception user sees only members, plans, payments, and appointments belonging to the assigned branch.</p><div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />} Save assignment</Button></div></form>;
}
