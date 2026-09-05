import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { memberSchema } from "@/lib/validations/member";
import { createMember, listMembers } from "@/services/member.service";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = request.nextUrl.searchParams;
  const result = await listMembers({ page: Number(q.get("page") ?? 1), pageSize: Math.min(Number(q.get("pageSize") ?? 10), 100), search: q.get("search") ?? undefined, status: q.get("status") ?? undefined, branchId: profile.branch_id });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = memberSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  try { return NextResponse.json(await createMember(parsed.data, profile.id, profile.tenant_id), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create member" }, { status: 400 }); }
}
