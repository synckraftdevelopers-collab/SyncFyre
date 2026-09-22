"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ConsolidatedBranchExportRow = {
  branchId: string;
  branchName: string;
  netRevenue: number;
  transactionCount: number;
  activeMembers: number;
  newMembers: number;
};

function toCsvValue(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Client-side CSV export for the Consolidated Cross-Branch Reports page.
 * The branch-comparison data is already on the page (fetched server-side),
 * so this just serializes it and triggers a browser download — no server
 * round-trip, no new API route.
 */
export function ConsolidatedExportButton({
  rows,
  dateFrom,
  dateTo,
}: {
  rows: ConsolidatedBranchExportRow[];
  dateFrom: string;
  dateTo: string;
}) {
  function handleExport() {
    const headers = ["Branch", "Net Revenue", "Transactions", "Active Members", "New Members"];
    const lines = [
      headers.join(","),
      ...rows.map((row) =>
        [row.branchName, row.netRevenue, row.transactionCount, row.activeMembers, row.newMembers]
          .map(toCsvValue)
          .join(","),
      ),
    ];
    const csv = lines.join("\n");

    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `consolidated-report-${dateFrom}-to-${dateTo}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      // Blob/download APIs unavailable (e.g. very old browser) — silently no-op
      // rather than throw, since this is a convenience export, not core data.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
      <Download className="size-3.5" />
      Export CSV
    </Button>
  );
}
