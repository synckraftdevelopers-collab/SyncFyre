import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { memberSchema } from "@/lib/validations/member";
import { updateMember } from "@/services/member.service";
import { deactivateMember } from "@/services/member-extended.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = memberSchema.partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  try { return NextResponse.json(await updateMember((await params).id, parsed.data, profile.id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update member" }, { status: 400 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager"].includes(profile.role?.slug ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { await deactivateMember((await params).id, profile.id); return NextResponse.json({ success: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to deactivate member" }, { status: 400 }); }
}
