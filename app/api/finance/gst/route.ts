import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listGstTransactions, getGstSummary } from "@/services/finance.service";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const p = url.searchParams;
  const view = p.get("view") ?? "list";

  try {
    if (view === "summary") {
      const result = await getGstSummary(
        p.get("branch_id"),
        p.get("date_from") ?? undefined,
        p.get("date_to") ?? undefined
      );
      return NextResponse.json(result);
    }
    const result = await listGstTransactions({
      branchId: p.get("branch_id"),
      page: Number(p.get("page") ?? 1),
      pageSize: Number(p.get("page_size") ?? 50),
      dateFrom: p.get("date_from") ?? undefined,
      dateTo: p.get("date_to") ?? undefined,
      txnType: (p.get("txn_type") as "sales" | "purchase" | "all" | null) ?? undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
