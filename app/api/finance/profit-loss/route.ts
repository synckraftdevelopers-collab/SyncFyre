import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfitAndLoss } from "@/services/finance.service";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const p = url.searchParams;

  try {
    const result = await getProfitAndLoss(
      p.get("branch_id"),
      p.get("date_from") ?? undefined,
      p.get("date_to") ?? undefined
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
