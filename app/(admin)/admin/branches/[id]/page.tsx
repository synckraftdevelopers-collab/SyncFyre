import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Cpu, UserRoundCog, Users } from "lucide-react";
import { requirePortalContext } from "@/lib/auth";
import { getBranchDetail } from "@/services/branch.service";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditBranchForm } from "@/components/branches/edit-branch-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: "Branch Details" };
}

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requirePortalContext(["owner", "admin", "manager"]);

  if (!profile.tenant_id) notFound();

  const branch = await getBranchDetail(id, profile.tenant_id);
  if (!branch) notFound();

  const isOwnerOrAdmin = profile.role?.slug === "owner" || profile.role?.slug === "admin";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/branches"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft className="mr-1 size-4" />
        All Branches
      </Link>

      {/* Branch header */}
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{branch.name}</h1>
          <p className="text-sm text-muted-foreground">
            Code: <span className="font-mono">{branch.code}</span>
            {branch.city || branch.state
              ? ` · ${[branch.city, branch.state].filter(Boolean).join(", ")}`
              : ""}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={branch.status === "active" ? "success" : "secondary"}>
            {branch.status}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Users className="size-8 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Active Members</p>
              <p className="text-2xl font-bold">{branch.memberCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <UserRoundCog className="size-8 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Staff</p>
              <p className="text-2xl font-bold">{branch.staffCount ?? branch.staff.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Cpu className="size-8 shrink-0 text-violet-600" />
            <div>
              <p className="text-sm text-muted-foreground">Machines</p>
              <p className="text-2xl font-bold">{branch.machineCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch details + edit */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Branch Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{branch.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono">{branch.code}</span>
            </div>
            {branch.address ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right">{branch.address}</span>
              </div>
            ) : null}
            {branch.city ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">City</span>
                <span>{branch.city}</span>
              </div>
            ) : null}
            {branch.state ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">State</span>
                <span>{branch.state}</span>
              </div>
            ) : null}
            {branch.phone ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{branch.phone}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {isOwnerOrAdmin ? (
          <Card>
            <CardHeader><CardTitle>Edit Branch</CardTitle></CardHeader>
            <CardContent>
              <EditBranchForm
                branchId={branch.id}
                defaultValues={{
                  name: branch.name,
                  city: branch.city ?? "",
                  state: branch.state ?? "",
                  address: branch.address ?? "",
                  phone: branch.phone ?? "",
                }}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Staff list */}
      {branch.staff.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Staff ({branch.staff.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {branch.staff.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 font-medium">{s.full_name ?? "—"}</td>
                    <td className="py-3 text-muted-foreground">{s.email ?? "—"}</td>
                    <td className="py-3 capitalize">{s.roleSlug?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="py-3">
                      <Badge variant={s.status === "active" ? "success" : "secondary"}>
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
