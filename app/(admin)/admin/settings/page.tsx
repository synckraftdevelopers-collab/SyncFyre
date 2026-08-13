import { Building2 } from "lucide-react";
import Link from "next/link";
import { PersonalSettingsForm } from "@/components/settings/personal-settings-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsBranchForms } from "@/components/settings/settings-branch-forms";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

const tabs = [
  ["profile", "Profile Settings"],
  ["application", "Application Settings"],
] as const;

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "profile" } = await searchParams;
  const activeTab = tab === "application" ? "application" : "profile";
  const profile = await requireUser(["admin", "manager"]);
  const sb = await createClient();

  const [{ data: branch }, { data: branches }, { data: finance }] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account details and the application configuration available to your branch.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/settings?tab=${id}`}
            className={buttonVariants({
              variant: activeTab === id ? "default" : "outline",
              size: "sm",
            })}
          >
            {label}
          </Link>
        ))}
      </div>

      {activeTab === "profile" && (
        <PersonalSettingsForm
          title="Profile Settings"
          description="Update your personal contact details for the current signed-in account."
          fullName={profile.full_name}
          phone={profile.phone}
        />
      )}

      {activeTab === "application" && (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <SettingsBranchForms branch={branch} finance={finance} isAdmin={profile.role?.slug === "admin"} />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-muted-foreground" />
                <CardTitle>Active Branches</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Branch configuration affects branch selectors and operational data visibility across the app.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(branches ?? []).map((branchRow) => (
                <div key={branchRow.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{branchRow.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {branchRow.code}
                        {branchRow.city ? ` | ${branchRow.city}` : ""}
                        {branchRow.phone ? ` | ${branchRow.phone}` : ""}
                      </p>
                    </div>
                    <Badge variant="success">{branchRow.status}</Badge>
                  </div>
                </div>
              ))}
              {!(branches ?? []).length && <p className="text-sm text-muted-foreground">No active branches found.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
