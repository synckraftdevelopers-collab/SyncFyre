import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isResourceName, resourceSchemas, tableForResource } from "@/lib/validations/resources";

async function authorize(resource: string) { const profile = await getCurrentProfile(); return profile && profile.role?.slug !== "member" && isResourceName(resource) ? profile : null; }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params; const profile = await authorize(resource); if (!profile || !isResourceName(resource)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = resourceSchemas[resource].partial().safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  const payload = { ...parsed.data } as Record<string, unknown>; if (profile.branch_id && "branch_id" in payload) payload.branch_id = profile.branch_id;
  const supabase = await createClient(); const { data, error } = await supabase.from(tableForResource[resource]).update(payload).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json(data);
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params; const profile = await authorize(resource); if (!profile || !isResourceName(resource) || !["admin","manager"].includes(profile.role?.slug ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient(); const { error } = await supabase.from(tableForResource[resource]).delete().eq("id", id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return new NextResponse(null, { status: 204 });
}
