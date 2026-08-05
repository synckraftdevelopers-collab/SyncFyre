import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listReceivables } from "@/services/finance.service";
import type { ReceivableType } from "@/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const p = url.searchParams;

  try {
    const result = await listReceivables({
      branchId: p.get("branch_id"),
      page: Number(p.get("page") ?? 1),
      pageSize: Number(p.get("page_size") ?? 30),
      status: p.get("status") ?? undefined,
      receivableType: (p.get("type") as ReceivableType | "all" | null) ?? undefined,
      memberId: p.get("member_id") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
