import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getReportsOverview } from "@/services/reports-analytics.service";
import type { ReportsFilterState } from "@/types";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const requestedBranch = params.get("branchId");
  const canSeeAllBranches = profile.role?.slug === "admin" || profile.role?.slug === "manager";
  const branchId = canSeeAllBranches ? requestedBranch && requestedBranch !== "all" ? requestedBranch : null : profile.branch_id;

  const filters: ReportsFilterState = {
    datePreset: params.get("datePreset") ?? "this_month",
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
    branchId,
    paymentMode: params.get("paymentMode") ?? "all",
    membershipPlanId: params.get("membershipPlanId") ?? "all",
    trainerId: params.get("trainerId") ?? "all",
    incomeCategoryId: params.get("incomeCategoryId") ?? "all",
    expenseCategoryId: params.get("expenseCategoryId") ?? "all",
    memberId: params.get("memberId") ?? "all",
    status: params.get("status") ?? "all",
  };

  try {
    const result = await getReportsOverview(filters, branchId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load reports overview." },
      { status: 500 }
    );
  }
}
