"use client";

import { useCallback } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MemberRegisterRow } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Props {
  data: MemberRegisterRow[];
  total: number;
}

export function MemberTableToolbar({ data, total }: Props) {
  const exportCSV = useCallback(() => {
    const headers = [
      "#", "Member Code", "Name", "Phone", "Email", "Gender",
      "Plan", "Join Date", "Expiry", "Days Left", "Trainer",
      "Membership Status", "Branch",
    ];

    const rows = data.map((m, i) => [
      i + 1,
      m.member_code,
      m.full_name,
      m.phone,
      m.email ?? "",
      m.gender ?? "",
      m.current_plan ?? "",
      m.joined_date,
      m.subscription_end ?? "",
      m.days_remaining ?? "",
      m.assigned_trainer ?? "",
      m.subscription_status ?? "",
      m.branch_name,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `members-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const print = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {total.toLocaleString()} member{total !== 1 ? "s" : ""}
      </span>
      <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
        <Download className="size-3.5" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={print} className="gap-1.5 print:hidden">
        <Printer className="size-3.5" />
        Print
      </Button>
    </div>
  );
}
