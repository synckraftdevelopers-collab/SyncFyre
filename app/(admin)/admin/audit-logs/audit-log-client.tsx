"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, RefreshCcw, ShieldCheck } from "lucide-react";
import { getAuditLogsAction, type AuditLogRow, type AuditLogParams, type AuditLogSortColumn } from "@/app/actions/audit-log-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SORTABLE_COLUMNS: { label: string; column: AuditLogSortColumn }[] = [
  { label: "Timestamp", column: "created_at" },
  { label: "Action", column: "action" },
  { label: "Entity", column: "entity_type" },
];

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "login", label: "Login" },
  { value: "payment", label: "Payment" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "All entities" },
  { value: "member", label: "Member" },
  { value: "staff", label: "Staff" },
  { value: "subscription", label: "Subscription" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "lead", label: "Lead" },
  { value: "branch", label: "Branch" },
];

function formatDatetime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function actionBadgeVariant(action: string): "default" | "success" | "danger" | "secondary" {
  if (action === "create") return "success";
  if (action === "delete") return "danger";
  if (action === "update") return "default";
  return "secondary";
}

interface Props {
  initialPage: number;
  initialFrom: string;
  initialTo: string;
  initialAction: string;
  initialEntityType: string;
  initialSortColumn?: AuditLogSortColumn;
  initialSortDir?: "asc" | "desc";
}

export function AuditLogClient({
  initialPage,
  initialFrom,
  initialTo,
  initialAction,
  initialEntityType,
  initialSortColumn,
  initialSortDir,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(initialPage);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [action, setAction] = useState(initialAction);
  const [entityType, setEntityType] = useState(initialEntityType);
  const [sortColumn, setSortColumn] = useState<AuditLogSortColumn | undefined>(initialSortColumn);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | undefined>(initialSortDir);

  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(
    async (params: AuditLogParams) => {
      setLoading(true);
      setError(null);
      const result = await getAuditLogsAction(params);
      if (result.error) {
        setError(result.error);
      } else {
        setRows(result.data);
        setTotal(result.total);
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    fetchLogs({ page, pageSize: PAGE_SIZE, from: from || undefined, to: to || undefined, action: action || undefined, entityType: entityType || undefined, sortColumn, sortDir });
  }, [page, from, to, action, entityType, sortColumn, sortDir, fetchLogs]);

  function handleSort(column: AuditLogSortColumn) {
    const nextDir: "asc" | "desc" = sortColumn === column && sortDir === "asc" ? "desc" : "asc";
    setSortColumn(column);
    setSortDir(nextDir);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortColumn", column);
    params.set("sortDir", nextDir);
    params.set("page", "1");
    startTransition(() => router.push(`?${params.toString()}`));
  }

  function handleFilter() {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from); else params.delete("from");
    if (to) params.set("to", to); else params.delete("to");
    if (action) params.set("action", action); else params.delete("action");
    if (entityType) params.set("entityType", entityType); else params.delete("entityType");
    params.set("page", "1");
    startTransition(() => router.push(`?${params.toString()}`));
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    startTransition(() => router.push(`?${params.toString()}`));
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">From date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">To date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Action type</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Entity type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {ENTITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={handleFilter} disabled={isPending || loading}>
              <Filter className="mr-1 size-3.5" />
              Apply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFrom(""); setTo(""); setAction(""); setEntityType(""); setPage(1);
              }}
              disabled={isPending || loading}
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchLogs({ page, pageSize: PAGE_SIZE, from: from || undefined, to: to || undefined, action: action || undefined, entityType: entityType || undefined })}
              disabled={loading}
            >
              <RefreshCcw className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" />
            Activity Log
          </CardTitle>
          {!loading && !error && (
            <span className="text-sm text-muted-foreground">
              {total.toLocaleString("en-IN")} record{total !== 1 ? "s" : ""}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : loading ? (
            <div className="grid min-h-40 place-items-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="grid min-h-40 place-items-center text-sm text-muted-foreground">
              No audit log entries found for the selected filters.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      {SORTABLE_COLUMNS.map(({ label, column }) => {
                        const isActive = sortColumn === column;
                        const Icon = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                        return (
                          <th key={column} className="px-3 py-3 font-medium">
                            <button
                              type="button"
                              onClick={() => handleSort(column)}
                              className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
                            >
                              {label}
                              <Icon className={`size-3.5 ${isActive ? "" : "opacity-40"}`} />
                            </button>
                          </th>
                        );
                      })}
                      <th className="px-3 py-3 font-medium">Entity ID</th>
                      <th className="px-3 py-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr key={row.id} className="align-middle hover:bg-muted/30">
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDatetime(row.created_at)}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={actionBadgeVariant(row.action)} className="capitalize">
                            {row.action}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 capitalize text-muted-foreground">
                          {row.entity_type?.replace(/_/g, " ") ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {row.entity_id ? row.entity_id.slice(0, 8) + "…" : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {row.description ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
