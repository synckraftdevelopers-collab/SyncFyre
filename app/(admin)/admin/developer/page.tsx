import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { createClient } from "@/lib/supabase/server";
import { DeveloperTabs } from "@/components/developer/developer-tabs";

export const metadata = { title: "Developer" };

export default async function DeveloperPage() {
  const profile = await getCurrentProfile();
  const enabled = profile?.tenant_id ? await hasCurrentFeature("api_webhooks") : false;

  if (!profile?.tenant_id || !enabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Developer</h1>
          <p className="text-sm text-muted-foreground">API keys and webhooks for custom integrations</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted">
              <Lock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">APIs and webhooks</p>
              <p className="text-sm text-muted-foreground">
                Not available on your current plan. Upgrade to Scale to issue API keys and configure webhook
                endpoints for your integrations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: apiKeys }, { data: webhooks }, { data: branches }] = await Promise.all([
    supabase
      .from("api_keys")
      .select("id,name,branch_id,key_prefix,scopes,last_used_at,expires_at,revoked_at,created_at")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("webhook_endpoints")
      .select("id,url,branch_id,events,is_active,created_at")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("branches")
      .select("id,name")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "active")
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Developer</h1>
        <p className="text-sm text-muted-foreground">API keys and webhooks for custom integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API access</CardTitle>
        </CardHeader>
        <CardContent>
          <DeveloperTabs
            apiKeys={apiKeys ?? []}
            webhooks={webhooks ?? []}
            branches={branches ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
