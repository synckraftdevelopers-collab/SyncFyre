import Link from "next/link";
import { Building2, Plus, Users, UserRoundCog, Cpu } from "lucide-react";
import { requirePortalContext } from "@/lib/auth";
import { getBranchesWithStats } from "@/services/branch.service";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateBranchForm } from "@/components/branches/create-branch-form";
import { DeleteBranchButton } from "@/components/branches/delete-branch-button";

export const metadata = { title: "Branches" };

export default async function AdminBranchesPage() {
  const profile = await requirePortalContext(["owner", "admin", "manager"]);

  if (!profile.tenant_id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Branches</h1>
        <p className="text-muted-foreground">Your account is not linked to an organization.</p>
      </div>
    );
  }

  const branches = await getBranchesWithStats(profile.tenant_id);
  const activeBranches = branches.filter((b) => b.status === "active");
  const isOwnerOrAdmin = profile.role?.slug === "owner" || profile.role?.slug === "admin";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Branches</h1>
            <p className="text-sm text-muted-foreground">
              Manage your gym&apos;s locations. Each branch has its own members, staff, and settings.
            </p>
          </div>
        </div>
      </div>

      {/* Branch count summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Building2 className="size-8 shrink-0 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Active Branches</p>
              <p className="text-2xl font-bold">{activeBranches.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Users className="size-8 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">
                {activeBranches.reduce((sum, b) => sum + (b.memberCount ?? 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <UserRoundCog className="size-8 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-bold">
                {activeBranches.reduce((sum, b) => sum + (b.staffCount ?? 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>All Branches</CardTitle>
          <Badge variant="secondary">{activeBranches.length} active</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {activeBranches.length === 0 ? (
            <div className="grid min-h-40 place-items-center text-center text-sm text-muted-foreground">
              No active branches found.
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Members</th>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Machines</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isOwnerOrAdmin ? <th className="px-4 py-3 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeBranches.map((branch) => (
                  <tr key={branch.id} className="align-middle hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/branches/${branch.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {branch.name}
                      </Link>
                      {branch.phone ? (
                        <p className="text-xs text-muted-foreground">{branch.phone}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{branch.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[branch.city, branch.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5 text-muted-foreground" />
                        {branch.memberCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <UserRoundCog className="size-3.5 text-muted-foreground" />
                        {branch.staffCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <Cpu className="size-3.5 text-muted-foreground" />
                        {branch.machineCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={branch.status === "active" ? "success" : "secondary"}>
                        {branch.status}
                      </Badge>
                    </td>
                    {isOwnerOrAdmin ? (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/branches/${branch.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Manage
                          </Link>
                          <DeleteBranchButton
                            branchId={branch.id}
                            branchName={branch.name}
                            isCurrentBranch={branch.id === profile.branch_id}
                            totalActiveBranches={activeBranches.length}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create new branch — owner/admin only */}
      {isOwnerOrAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4" />
              Add New Branch
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create a new branch location for your gym. Each branch gets its own member and staff roster.
            </p>
          </CardHeader>
          <CardContent>
            <CreateBranchForm />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
