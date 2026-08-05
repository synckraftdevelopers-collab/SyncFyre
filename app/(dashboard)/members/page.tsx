import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react";
import { MembersTable } from "@/components/members/members-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentProfile } from "@/lib/auth";
import { listMembers } from "@/services/member.service";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const currentPage = Math.max(1, Number(query.page ?? 1));

  const result = await listMembers({
    page: currentPage,
    search: query.q,
    status: query.status,
    branchId: profile?.branch_id,
  });

  const totalPages = Math.max(1, result.totalPages);

  /** Build a URL preserving current filters but changing the page */
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.status && query.status !== "all") params.set("status", query.status);
    params.set("page", String(p));
    return `/members?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage profiles, health details, and membership status.
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href="/api/members/export" className={buttonVariants({ variant: "outline" })}>
            <Download className="size-4" />
            Export
          </Link>
          <Link href="/members/new" className={buttonVariants({})}>
            <Plus className="size-4" />
            Add member
          </Link>
        </div>
      </div>

      <Card>
        {/* Filter bar */}
        <form className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query.q}
              className="pl-9"
              placeholder="Search by name, member ID, or phone"
            />
          </div>
          <select
            name="status"
            defaultValue={query.status ?? "all"}
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {/* Reset page to 1 when applying new filter */}
          <input type="hidden" name="page" value="1" />
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>

        {/* Table */}
        <MembersTable data={result.data} />

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>
            {result.total} member{result.total === 1 ? "" : "s"}
          </span>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">
              Page {currentPage} of {totalPages}
            </span>

            <Link
              href={pageUrl(currentPage - 1)}
              aria-label="Previous page"
              aria-disabled={currentPage <= 1}
              className={buttonVariants({
                variant: "outline",
                size: "icon",
              }) + (currentPage <= 1 ? " pointer-events-none opacity-40" : "")}
            >
              <ChevronLeft className="size-4" />
            </Link>

            <Link
              href={pageUrl(currentPage + 1)}
              aria-label="Next page"
              aria-disabled={currentPage >= totalPages}
              className={buttonVariants({
                variant: "outline",
                size: "icon",
              }) + (currentPage >= totalPages ? " pointer-events-none opacity-40" : "")}
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
