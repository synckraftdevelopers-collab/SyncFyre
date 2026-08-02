import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isResourceName, resourceSchemas, tableForResource } from "@/lib/validations/resources";

export async function GET(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const profile = await getCurrentProfile(); if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resource = (await params).resource; if (!isResourceName(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const queryParams = request.nextUrl.searchParams; const page = Math.max(1, Number(queryParams.get("page") ?? 1)); const pageSize = Math.min(100, Math.max(1, Number(queryParams.get("pageSize") ?? 20)));
  const supabase = await createClient(); let query = supabase.from(tableForResource[resource]).select("*", { count: "exact" });
  if (profile.branch_id && resource !== "notifications") query = query.eq("branch_id", profile.branch_id);
  for (const key of ["status", "member_id", "trainer_id", "appointment_date"] as const) { const value = queryParams.get(key); if (value) query = query.eq(key, value); }
  const from = (page - 1) * pageSize; const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const profile = await getCurrentProfile(); if (!profile || profile.role?.slug === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const resource = (await params).resource; if (!isResourceName(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const requestBody = await request.json() as Record<string, unknown>;
  if (profile.branch_id) requestBody.branch_id = profile.branch_id;
  const parsed = resourceSchemas[resource].safeParse(requestBody); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  const payload = { ...parsed.data } as Record<string, unknown>; if (profile.branch_id && "branch_id" in payload) payload.branch_id = profile.branch_id;
  if (["subscriptions", "appointments", "invoices"].includes(resource)) payload.created_by = profile.id; if (resource === "payments") payload.collected_by = profile.id; if (resource === "progress") payload.recorded_by = profile.id;
  if (resource === "payments" && payload.status === "completed" && !payload.paid_at) payload.paid_at = new Date().toISOString();
  const supabase = await createClient(); const { data, error } = await supabase.from(tableForResource[resource]).insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json(data, { status: 201 });
}
