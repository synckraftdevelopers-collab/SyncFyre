import { Database, Lock, ShieldCheck, Sparkles, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { activateSystemPhaseFormAction } from "@/app/actions/phase-actions";
import { getPhaseSnapshot } from "@/services/phase.service";
import { cn } from "@/lib/utils";

export const metadata = { title: "Platform Settings" };

export default async function SuperAdminSettingsPage() {
  const profile = await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const phaseSnapshot = await getPhaseSnapshot();
  const [{ count: tenants }, { count: users }] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }),
    admin.from("users").select("id", { count: "exact", head: true }),
  ]);
  const phaseCounts = phaseSnapshot.features.reduce<Record<string, number>>((acc, feature) => {
    acc[feature.phase] = (acc[feature.phase] ?? 0) + 1;
    return acc;
  }, {});
  const activePhaseIndex = phaseSnapshot.phases.findIndex((phase) => phase.phase_key === phaseSnapshot.currentPhase.phase_key);
  const nextPhase = phaseSnapshot.phases[activePhaseIndex + 1] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Platform access and system overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" />Your access</CardTitle>
            <CardDescription>Current platform administrator account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><p className="text-muted-foreground">Name</p><p className="font-medium">{profile.full_name || "Super Admin"}</p></div>
            <div><p className="text-muted-foreground">Email</p><p className="font-medium">{profile.email || "Not available"}</p></div>
            <Badge variant="success">Super Admin</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="size-5 text-primary" />Platform overview</CardTitle>
            <CardDescription>Live totals from the configured platform database.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">Tenants</p><p className="mt-1 text-2xl font-bold">{tenants ?? 0}</p></div>
            <div className="rounded-xl bg-muted/60 p-4"><p className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3" />Users</p><p className="mt-1 text-2xl font-bold">{users ?? 0}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />Release Phases</CardTitle>
          <CardDescription>Control which feature wave is currently available across the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {phaseSnapshot.phases.map((phase) => {
              const isCurrent = phase.phase_key === phaseSnapshot.currentPhase.phase_key;
              return (
                <div key={phase.phase_key} className={cn("rounded-2xl border p-4", isCurrent ? "border-primary/40 bg-primary/5" : "bg-muted/30")}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{phase.phase_key}</p>
                      <p className="text-xs text-muted-foreground">{phase.name}</p>
                    </div>
                    <Badge variant={isCurrent ? "success" : "outline"}>{phase.status}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Features</span>
                    <span className="font-semibold">{phaseCounts[phase.phase_key] ?? 0}</span>
                  </div>
                  {phase.activated_at ? <p className="mt-2 text-xs text-muted-foreground">Activated {new Date(phase.activated_at).toLocaleDateString("en-IN")}</p> : <p className="mt-2 text-xs text-muted-foreground">Locked</p>}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Current system phase</p>
                <p className="text-sm text-muted-foreground">{phaseSnapshot.currentPhase.phase_key} is active now.</p>
              </div>
              {nextPhase ? (
                <form action={activateSystemPhaseFormAction}>
                  <input type="hidden" name="phase_key" value={nextPhase.phase_key} />
                  <Button type="submit" className="gap-2">
                    <Lock className="size-4" />
                    Activate {nextPhase.phase_key}
                  </Button>
                </form>
              ) : (
                <Badge variant="success">Maximum phase active</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
