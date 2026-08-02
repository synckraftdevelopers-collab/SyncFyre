import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { memberSchema } from "@/lib/validations/member";
import { deleteMember, updateMember } from "@/services/member.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = memberSchema.partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  try { return NextResponse.json(await updateMember((await params).id, parsed.data)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update member" }, { status: 400 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager"].includes(profile.role?.slug ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { await deleteMember((await params).id); return new NextResponse(null, { status: 204 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete member" }, { status: 400 }); }
}
