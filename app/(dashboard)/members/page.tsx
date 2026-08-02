import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { MembersTable } from "@/components/members/members-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentProfile } from "@/lib/auth";
import { listMembers } from "@/services/member.service";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const result = await listMembers({ page: Number(query.page ?? 1), search: query.q, status: query.status, branchId: profile?.branch_id });
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Members</h1><p className="text-sm text-muted-foreground">Manage profiles, health details, and membership status.</p></div><div className="ml-auto flex gap-2"><Link href="/api/members/export" className={buttonVariants({ variant: "outline" })}><Download className="size-4"/>Export</Link><Link href="/members/new" className={buttonVariants({})}><Plus className="size-4"/>Add member</Link></div></div>
    <Card><form className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input name="q" defaultValue={query.q} className="pl-9" placeholder="Search by name, member ID, or phone"/></div><select name="status" defaultValue={query.status ?? "all"} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><Button type="submit" variant="outline">Apply</Button></form><MembersTable data={result.data}/><div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground"><span>{result.total} member{result.total === 1 ? "" : "s"}</span><span>Page {result.page} of {Math.max(1, result.totalPages)}</span></div></Card>
  </div>;
}
