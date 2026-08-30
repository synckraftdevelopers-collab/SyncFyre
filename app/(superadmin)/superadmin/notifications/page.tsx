import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS_NOTIFICATION_TYPES } from "@/lib/notifications/business";

export const metadata = { title: "Platform Notifications" };

export default async function SuperAdminNotificationsPage() {
  await requireUser(["super_admin"]);
  const supabase = await createClient();

  // Super admin sees tenant_id=null notifications targeted to super_admin role
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, read_at, created_at, metadata")
    .is("tenant_id", null)
    .contains("target_roles", ["super_admin"])
    .in("type", BUSINESS_NOTIFICATION_TYPES)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error && !error.message?.includes("does not exist")) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const unread = rows.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Platform Notifications</h1>
          {unread > 0 && <Badge variant="warning">{unread} unread</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          System-wide events: new gym registrations and platform alerts.
        </p>
      </div>

      <Card>
        {rows.length > 0 ? (
          <div className="divide-y">
            {rows.map((notification) => (
              <div
                key={notification.id}
                className={`flex gap-3 p-4 ${!notification.read_at ? "bg-primary/5" : ""}`}
              >
                <span
                  className={`mt-2 size-2 shrink-0 rounded-full ${
                    !notification.read_at ? "bg-primary" : "bg-transparent"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!notification.read_at ? "font-bold" : "font-medium"}`}>
                    {notification.title}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {notification.type}
                  </Badge>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CardContent className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <Bell className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No new notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Platform events such as new gym registrations will appear here.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
