import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listExpenses } from "@/services/finance.service";
import type { ExpenseApprovalStatus } from "@/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const p = url.searchParams;

  try {
    const result = await listExpenses({
      branchId: p.get("branch_id"),
      page: Number(p.get("page") ?? 1),
      pageSize: Number(p.get("page_size") ?? 30),
      dateFrom: p.get("date_from") ?? undefined,
      dateTo: p.get("date_to") ?? undefined,
      categoryId: p.get("category_id") ?? undefined,
      vendorId: p.get("vendor_id") ?? undefined,
      approvalStatus: (p.get("approval_status") as ExpenseApprovalStatus | "all" | null) ?? undefined,
      status: p.get("status") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
