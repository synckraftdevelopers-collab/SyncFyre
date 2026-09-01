import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFinanceDashboardMetrics,
  getFinanceRevenueTrend,
  getPaymentModeBreakdown,
  getReceivableAging,
} from "@/services/finance.service";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch_id");
  const dateFrom = url.searchParams.get("date_from") ?? undefined;
  const dateTo = url.searchParams.get("date_to") ?? undefined;

  try {
    const [metrics, trend, modes, aging] = await Promise.all([
      getFinanceDashboardMetrics(branchId, dateFrom, dateTo),
      getFinanceRevenueTrend(branchId, 6, dateFrom, dateTo),
      getPaymentModeBreakdown(branchId, dateFrom, dateTo),
      getReceivableAging(branchId),
    ]);
    return NextResponse.json({ metrics, trend, modes, aging });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
