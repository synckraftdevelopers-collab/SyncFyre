import Link from "next/link";
import { Building2, Plus, Users, UserRoundCog, Cpu } from "lucide-react";
import { requirePortalContext } from "@/lib/auth";
import { getBranchesWithStats } from "@/services/branch.service";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateBranchForm } from "@/components/branches/create-branch-form";
import { DeleteBranchButton } from "@/components/branches/delete-branch-button";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Branches" };

const SORTABLE_COLUMNS = [
  { label: "Branch", column: "branch" as const },
  { label: "Code", column: "code" as const },
  { label: "Location", column: "location" as const },
  { label: "Members", column: "members" as const },
  { label: "Staff", column: "staff" as const },
  { label: "Machines", column: "machines" as const },
  { label: "Status", column: "status" as const },
];

export default async function AdminBranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const profile = await requirePortalContext(["owner", "admin", "manager"]);
  const sp = await searchParams;

  if (!profile.tenant_id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Branches</h1>
        <p className="text-muted-foreground">Your account is not linked to an organization.</p>
      </div>
    );
  }

  const branches = await getBranchesWithStats(profile.tenant_id);
  let activeBranches = branches.filter((b) => b.status === "active");
  const isOwnerOrAdmin = profile.role?.slug === "owner" || profile.role?.slug === "admin";

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (branch: (typeof activeBranches)[number]): string | number => {
      switch (colSort) {
        case "branch": return branch.name ?? "";
        case "code": return branch.code ?? "";
        case "location": return [branch.city, branch.state].filter(Boolean).join(", ");
        case "members": return branch.memberCount ?? 0;
        case "staff": return branch.staffCount ?? 0;
        case "machines": return branch.machineCount ?? 0;
        case "status": return branch.status ?? "";
        default: return "";
      }
    };
    activeBranches = [...activeBranches].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

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
                  {SORTABLE_COLUMNS.map(({ label, column }) => (
                    <SortableTh
                      key={column}
                      label={label}
                      column={column}
                      basePath="/admin/branches"
                      searchParams={sp as Record<string, string | undefined>}
                      currentSort={colSort}
                      currentDir={colDir}
                      paramNames={{ sort: "colSort", dir: "colDir" }}
                      className="px-4 py-3 font-medium"
                    />
                  ))}
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
