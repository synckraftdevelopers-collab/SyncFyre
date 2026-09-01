"use client";

import { useState, useActionState, useEffect, useTransition } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Plus,
  X,
  UsersRound,
  Shield,
  UserRoundCog,
  Utensils,
  UserCheck,
  LoaderCircle,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createStaffAccountAction } from "@/app/actions/staff-account-actions";
import { deleteStaffAction, setStaffStatusAction } from "@/app/actions/staff-management-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StaffRoleSlug = "admin" | "manager" | "reception" | "trainer" | "dietician";

const ROLE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  admin: { icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
  manager: { icon: Shield, color: "text-blue-600", bg: "bg-blue-50" },
  reception: { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  trainer: { icon: UserRoundCog, color: "text-orange-600", bg: "bg-orange-50" },
  dietician: { icon: Utensils, color: "text-pink-600", bg: "bg-pink-50" },
};

const ROLE_DESC: Record<string, string> = {
  reception: "Can register members, collect payments, and manage appointments.",
  trainer: "Can view assigned members, log workouts and record progress.",
  dietician: "Can view assigned members and manage diet plans.",
  manager: "Full branch access. Cannot manage other admins.",
};

type StaffRow = {
  id: string;
  employee_code: string;
  designation: string | null;
  joining_date: string | null;
  salary: number | null;
  status: string;
  source_user_id: string | null;
  branch_name: string | null;
  users: { full_name: string | null; email: string | null; avatar_url: string | null; roles?: { name: string | null; slug: string | null } | null } | null;
  branches: { name: string | null } | null;
};

export function StaffDashboard({
  staffRows,
  branches,
  roles,
  hasServiceKey,
  isAdmin,
}: {
  staffRows: StaffRow[];
  branches: { id: string; name: string }[];
  roles: { id: string; name: string; slug: string }[];
  hasServiceKey: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(staffRows);
  const [state, action, pending] = useActionState(createStaffAccountAction, {});

  useEffect(() => {
    setRows(staffRows);
  }, [staffRows]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success(state.success);
      setOpen(false);
    }
  }, [state]);

  const byRole = rows.reduce<Record<string, StaffRow[]>>((acc, staffMember) => {
    const slug = staffMember.users?.roles?.slug ?? "unknown";
    if (!acc[slug]) acc[slug] = [];
    acc[slug].push(staffMember);
    return acc;
  }, {});

  const roleOrder = ["manager", "reception", "trainer", "dietician"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            All staff accounts assigned to this branch.
          </p>
        </div>
        <Button className="ml-auto gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add Staff
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roleOrder.map((slug) => {
          const meta = ROLE_META[slug];
          const Icon = meta?.icon ?? UsersRound;
          const count = byRole[slug]?.filter((staffMember) => staffMember.status === "active").length ?? 0;
          const label = roles.find((role) => role.slug === slug)?.name ?? slug;
          return (
            <div key={slug} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
              <div className={`grid size-11 place-items-center rounded-xl ${meta?.bg ?? "bg-muted"}`}>
                <Icon className={`size-5 ${meta?.color ?? "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <p className="text-xs text-muted-foreground">active</p>
              </div>
            </div>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="grid min-h-56 place-items-center text-center">
            <div>
              <UsersRound className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No staff yet</p>
              <p className="text-sm text-muted-foreground">
                Click &ldquo;Add Staff&rdquo; to create the first account.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        roleOrder.map((slug) => {
          const group = byRole[slug];
          if (!group?.length) return null;
          const meta = ROLE_META[slug];
          const Icon = meta?.icon ?? UsersRound;
          const label = roles.find((role) => role.slug === slug)?.name ?? slug;
          return (
            <div key={slug}>
              <div className="mb-3 flex items-center gap-2">
                <Icon className={`size-4 ${meta?.color ?? "text-muted-foreground"}`} />
                <h2 className="font-semibold">{label}</h2>
                <span className="text-xs text-muted-foreground">- {ROLE_DESC[slug] ?? ""}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((item) => {
                  const initials = (item.users?.full_name ?? "?")
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                      <div
                        className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white ${meta?.bg ?? "bg-muted"}`}
                        style={{ background: avatarColor(item.users?.full_name ?? "") }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{item.users?.full_name ?? "-"}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.users?.email ?? ""}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.designation ?? ""}
                          {item.employee_code ? ` · ${item.employee_code}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge variant={item.status === "active" ? "success" : "outline"}>{item.status}</Badge>
                        <StaffRowActions item={item} canManage={isAdmin} onDeleted={(deletedId, deletedUserId) => {
                          setRows((current) =>
                            current.filter((row) => row.id !== deletedId && (!deletedUserId || row.source_user_id !== deletedUserId)),
                          );
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {open ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Add Staff Account</h2>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {!hasServiceKey ? (
                <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code> to create staff accounts.
                </div>
              ) : null}

              <form id="add-staff-form" action={action} className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Full name *</span>
                  <Input name="full_name" required disabled={!hasServiceKey} placeholder="e.g. Rahul Sharma" autoComplete="off" />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">Email *</span>
                  <Input name="email" type="email" required disabled={!hasServiceKey} placeholder="staff@yourgym.com" autoComplete="new-password" />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">Temporary password *</span>
                  <Input name="password" type="password" minLength={8} required disabled={!hasServiceKey} placeholder="Min. 8 characters" autoComplete="new-password" />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">Designation *</span>
                  <Input name="designation" required disabled={!hasServiceKey} placeholder="e.g. Receptionist, Head Trainer" />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Branch *</span>
                    <select name="branch_id" required disabled={!hasServiceKey} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                      <option value="">- Select branch -</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Role *</span>
                    <select name="role" required disabled={!hasServiceKey} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                      <option value="">- Select role -</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.slug}>{role.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </form>
            </div>

            <div className="flex items-center gap-3 border-t px-6 py-4">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="add-staff-form" className="flex-1" disabled={pending || !hasServiceKey}>
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Create account
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StaffRowActions({ item, canManage, onDeleted }: { item: StaffRow; canManage: boolean; onDeleted: (deletedId: string, deletedUserId: string | null) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const name = item.users?.full_name?.trim() || item.employee_code || "Staff member";
  const branchName = item.branch_name?.trim() || item.branches?.name?.trim() || "Current branch";
  const staffId = item.id.startsWith("registered-") ? null : item.id;
  const userId = item.source_user_id;

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteStaffAction(staffId, userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onDeleted(item.id, userId);
      toast.success(result.success ?? "Staff deleted successfully.");
      setOpen(false);
      router.refresh();
    });
  };

  if (!canManage) return null;

  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full gap-1.5 border-destructive/30 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Open actions for ${name}`}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-44 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-[0_16px_40px_rgba(7,29,56,.14)]">
              {staffId ? (
                <DropdownMenu.Item asChild>
                  <form action={setStaffStatusAction.bind(null, item.id, item.status === "active" ? "inactive" : "active")}>
                    <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted">
                      {item.status === "active" ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item asChild>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive outline-none transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff?</DialogTitle>
            <DialogDescription className="space-y-1 pt-1 text-left">
              <span className="block">Are you sure you want to delete:</span>
              <span className="block font-semibold text-foreground">{name}</span>
              <span className="block">Staff ID: {item.employee_code || userId || item.id}</span>
              <span className="block">Branch: {branchName}</span>
              <span className="block">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function avatarColor(name: string): string {
  const colors = [
    "#e11d48",
    "#7c3aed",
    "#0284c7",
    "#059669",
    "#d97706",
    "#db2777",
    "#2563eb",
    "#16a34a",
  ];
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

