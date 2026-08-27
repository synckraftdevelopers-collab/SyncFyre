import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { verifyBiometricRegistration } from "@/services/biometric-admin.service";

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { mapping_id?: string };
  if (!body.mapping_id) return NextResponse.json({ error: "mapping_id is required." }, { status: 422 });

  try {
    return NextResponse.json(await verifyBiometricRegistration(body.mapping_id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify biometric registration." }, { status: 400 });
  }
}
