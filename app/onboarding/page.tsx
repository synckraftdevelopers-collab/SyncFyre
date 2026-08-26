import Link from "next/link";
import { redirect } from "next/navigation";
import { completeOnboardingAction, bootstrapOrganizationAction, skipMachineStepAction, updateOnboardingStepAction } from "./actions";
import { getPortalContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StepCard({ title, description, href, complete }: { title: string; description: string; href: string; complete: boolean }) {
  return <Card><CardHeader><CardTitle className="flex items-center justify-between text-base"><span>{title}</span><span className={`rounded-full px-2 py-1 text-xs ${complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{complete ? "Done" : "Pending"}</span></CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{description}</p><Link href={href} className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">Open step</Link></CardContent></Card>;
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const profile = await getPortalContext();
  if (!profile) redirect("/login");
  if (profile.role?.slug && profile.role.slug !== "owner" && profile.role.slug !== "member") redirect("/");

  const supabase = await createClient();
  let tenant: any = null;
  let progress: any = null;
  let counts = { plans: 0, trainers: 0, staff: 0, machines: 0 };
  let schemaMissing = false;

  if (profile.tenant_id) {
    const [
      { data: tenantData, error: tenantError },
      { data: progressData, error: progressError },
      { count: plans },
      { count: trainers },
      { count: staff },
      { count: machines },
    ] = await Promise.all([
      supabase.from("tenants").select("id,name,slug,email,phone,address,city,state,postal_code,country,gst_number,currency,timezone,trial_starts_at,trial_ends_at,onboarding_completed_at").eq("id", profile.tenant_id).maybeSingle(),
      supabase.from("tenant_onboarding_progress").select("tenant_id,current_step,completed_steps,machine_skipped").eq("tenant_id", profile.tenant_id).maybeSingle(),
      supabase.from("membership_plans").select("id", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
      supabase.from("trainers").select("id", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
      supabase.from("staff").select("id", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
      supabase.from("face_machine_settings").select("id", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
    ]);
    schemaMissing = isMissingSchemaError(tenantError) || isMissingSchemaError(progressError);
    tenant = tenantData;
    progress = progressData;
    counts = { plans: plans ?? 0, trainers: trainers ?? 0, staff: staff ?? 0, machines: machines ?? 0 };
  }

  const message = typeof params.created === "string" ? "Your gym profile has been created. Continue setup below." : typeof params.error === "string" ? decodeURIComponent(params.error) : null;
  const isError = typeof params.error === "string";
  const trialRange = tenant?.trial_starts_at && tenant?.trial_ends_at ? `${tenant.trial_starts_at} to ${tenant.trial_ends_at}` : null;

  if (profile.role?.slug === "owner" && tenant?.onboarding_completed_at) redirect("/admin/dashboard");

  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div className="space-y-2"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">SyncTyre onboarding</p><h1 className="text-3xl font-bold tracking-tight">Set up your gym</h1><p className="text-sm text-muted-foreground">Registration is complete. Verify your account, create your organization, and finish the remaining setup at your own pace.</p></div>
    {message ? <div className={`rounded-xl p-4 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</div> : null}
    {schemaMissing ? <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Owner onboarding requires the latest Supabase migrations. Apply `supabase/migrations/0017_owner_registration_onboarding.sql` and newer, then reload this page.</div> : null}

    {!profile.tenant_id && <Card><CardHeader><CardTitle>Create your gym / business</CardTitle></CardHeader><CardContent><form action={bootstrapOrganizationAction} className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Gym name<input name="gym_name" required className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" placeholder="ABC Fitness" /></label><label className="text-sm font-medium">Main branch name<input name="branch_name" defaultValue="Main Branch" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="text-sm font-medium">Phone<input name="phone" defaultValue={profile.phone ?? ""} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="text-sm font-medium">Logo URL<input name="logo_url" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" placeholder="https://..." /></label><label className="text-sm font-medium">Address<input name="address" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="text-sm font-medium">City<input name="city" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="text-sm font-medium">State<input name="state" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="text-sm font-medium">Pincode<input name="postal_code" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="text-sm font-medium">Country<input name="country" defaultValue="India" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="text-sm font-medium">GST / Tax number<input name="gst_number" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="text-sm font-medium">Currency<input name="currency" defaultValue="INR" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="text-sm font-medium">Timezone<input name="timezone" defaultValue="Asia/Kolkata" className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><div className="md:col-span-2"><Button type="submit">Create gym and activate 1-year free trial</Button></div></form></CardContent></Card>}

    {tenant && <>
      <Card><CardHeader><CardTitle>{tenant.name}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Organization</p><p className="font-medium">{tenant.slug}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Free trial</p><p className="font-medium">{trialRange ?? "Pending"}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Current step</p><p className="font-medium capitalize">{progress?.current_step?.replace(/_/g, " ") ?? "gym profile"}</p></div></CardContent></Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StepCard title="1. Gym profile" description="Organization and owner setup is stored against your tenant." href="/onboarding" complete={true} />
        <StepCard title="2. Main branch" description="Update branch details, GST, address, and contact information." href="/admin/settings" complete={true} />
        <StepCard title="3. Membership plans" description={`Existing plans: ${counts.plans}. Use the current membership plan module.`} href="/admin/memberships/new" complete={counts.plans > 0} />
        <StepCard title="4. Trainers" description={`Existing trainers: ${counts.trainers}. Reuse the current trainer flow.`} href="/admin/trainers/new" complete={counts.trainers > 0} />
        <StepCard title="5. Staff" description={`Existing staff accounts: ${counts.staff}. Reuse the current staff provisioning flow.`} href="/admin/staff/new" complete={counts.staff > 0} />
        <StepCard title="6. Attendance machine (optional)" description={`Existing machines: ${counts.machines}. You can connect a device now or skip for later.`} href="/admin/machines" complete={counts.machines > 0 || progress?.machine_skipped} />
      </div>

      <div className="flex flex-wrap gap-3">
        <form action={updateOnboardingStepAction}><input type="hidden" name="current_step" value="membership_plans" /><input type="hidden" name="completed_steps" value={JSON.stringify(["gym_profile", "main_branch"])} /><Button type="submit" variant="outline">Mark current progress</Button></form>
        <form action={skipMachineStepAction}><Button type="submit" variant="outline">Skip machine for now</Button></form>
        <form action={completeOnboardingAction}><Button type="submit">Your gym is ready</Button></form>
      </div>
    </>}
  </main>;
}
