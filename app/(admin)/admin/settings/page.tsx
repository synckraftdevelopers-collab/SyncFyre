import Link from "next/link";
import { Building2, FolderPlus, RadioTower, Settings2 } from "lucide-react";
import { SyncMachineButton } from "@/components/settings/sync-machine-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsBranchForms } from "@/components/settings/settings-branch-forms";
import { SettingsCategoryForm } from "@/components/settings/settings-category-form";

export const metadata = { title: "Settings" };

const tabs = [
  ["machines", "Face Machines"],
  ["branch",   "Branch Info"],
  ["income",   "Income Categories"],
  ["expense",  "Expense Categories"],
] as const;

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "machines" } = await searchParams;
  const profile = await requireUser(["admin", "manager"]);
  const sb = await createClient();

  const [
    { data: machines },
    { data: branch },
    { data: branches },
    { data: finance },
    { data: income },
    { data: expense },
  ] = await Promise.all([
    sb.from("face_machine_settings")
      .select("id,machine_name,machine_ip,machine_api_url,device_id,status,connection_status,last_sync_at")
      .eq("branch_id", profile.branch_id),
    sb.from("branches")
      .select("id,name,code,city,address,phone,status")
      .eq("id", profile.branch_id)
      .maybeSingle(),
    sb.from("branches")
      .select("id,name,code,city,phone,status")
      .eq("status", "active")
      .order("name"),
    sb.from("finance_settings")
      .select("gstin,fiscal_year_start_month")
      .eq("branch_id", profile.branch_id)
      .maybeSingle(),
    sb.from("income_categories")
      .select("id,name,code,status")
      .or(`branch_id.eq.${profile.branch_id},branch_id.is.null`)
      .order("name"),
    sb.from("expense_categories")
      .select("id,name,code,status")
      .or(`branch_id.eq.${profile.branch_id},branch_id.is.null`)
      .order("name"),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Branch configuration, income/expense categories, and device integrations.
        </p>
      </div>

      {/* Tab buttons */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/settings?tab=${id}`}
            className={buttonVariants({
              variant: tab === id ? "default" : "outline",
              size: "sm",
            })}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Face Machines tab ────────────────────────────────────────────── */}
      {tab === "machines" && (
        <Card>
          <CardHeader className="flex-row items-center">
            <div>
              <CardTitle>Face machine integration</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Configure attendance devices.</p>
            </div>
            <Link
              href="/admin/face-machines/new"
              className={buttonVariants({ className: "ml-auto" })}
            >
              <Settings2 className="size-4" />Add machine
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(machines ?? []).map((machine) => (
              <div
                key={machine.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
              >
                <RadioTower className="size-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{machine.machine_name}</p>
                  <p className="text-xs text-muted-foreground">{machine.device_id}</p>
                </div>
                <Badge
                  variant={
                    machine.connection_status === "online"
                      ? "success"
                      : machine.connection_status === "error"
                      ? "danger"
                      : "outline"
                  }
                >
                  {machine.connection_status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Last sync:{" "}
                  {machine.last_sync_at
                    ? new Date(machine.last_sync_at).toLocaleString("en-IN")
                    : "Never"}
                </span>
                <SyncMachineButton id={machine.id} configured={Boolean(machine.machine_api_url)} />
              </div>
            ))}
            {!(machines ?? []).length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No face machines configured.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Branch Info tab ──────────────────────────────────────────────── */}
      {tab === "branch" && (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          {/* Left: edit current branch */}
          <SettingsBranchForms
            branch={branch}
            finance={finance}
            isAdmin={profile.role?.slug === "admin"}
          />

          {/* Right: list of all active branches */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-muted-foreground" />
                <CardTitle>Active Branches</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Branches appear in member, staff, and plan selectors.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(branches ?? []).map((b) => (
                <div key={b.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.code}
                        {b.city   ? ` · ${b.city}`  : ""}
                        {b.phone  ? ` · ${b.phone}` : ""}
                      </p>
                    </div>
                    <Badge variant="success">{b.status}</Badge>
                  </div>
                </div>
              ))}
              {!(branches ?? []).length && (
                <p className="text-sm text-muted-foreground">No active branches found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Income Categories tab ────────────────────────────────────────── */}
      {tab === "income" && (
        <SettingsCategoryForm kind="income" rows={income ?? []} />
      )}

      {/* ── Expense Categories tab ───────────────────────────────────────── */}
      {tab === "expense" && (
        <SettingsCategoryForm kind="expense" rows={expense ?? []} />
      )}
    </div>
  );
}
