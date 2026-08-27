import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { deleteBiometricMapping, verifyBiometricRegistration } from "@/services/biometric-admin.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { action?: string };

  try {
    if (body.action === "verify") {
      return NextResponse.json(await verifyBiometricRegistration((await params).id));
    }
    return NextResponse.json({ error: "Unsupported action." }, { status: 422 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update biometric mapping." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unassign = request.nextUrl.searchParams.get("unassign") === "true";

  try {
    return NextResponse.json(await deleteBiometricMapping((await params).id, unassign));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete biometric mapping." }, { status: 400 });
  }
}
