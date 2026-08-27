import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationAutoRefresh } from "@/components/notifications/notification-auto-refresh";
import { NotificationTimestamp } from "@/components/notifications/notification-timestamp";
import { NotificationViewButton } from "@/components/notifications/notification-view-button";
import { notificationDestination } from "@/lib/notifications/destination";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ReceptionNotificationsPage() {
  const profile = await requireUser(["reception"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("tenant_id", profile.tenant_id ?? "00000000-0000-0000-0000-000000000000")
    .or(`user_id.eq.${profile.id},branch_id.eq.${profile.branch_id ?? ""}`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <NotificationAutoRefresh />
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Your branch notifications and member alerts.</p>
      </div>
      <Card>
        {rows.length ? (
          <div className="divide-y">
            {rows.map((notification) => (
              <div key={notification.id} className="flex gap-3 p-4">
                <Bell className="mt-1 size-4" />
                <div className="flex-1">
                  <p className={!notification.read_at ? "font-bold" : "font-medium"}>{notification.title}</p>
                  <Badge variant="outline">{notification.type}</Badge>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <div className="mt-3 flex items-center gap-3"><NotificationTimestamp createdAt={notification.created_at} /><NotificationViewButton id={notification.id} unread={!notification.read_at} destination={notificationDestination({ type: notification.type, memberId: notification.member_id, metadata: notification.metadata }, "reception", "/reception/notifications")} /></div>
              </div>
            ))}
          </div>
        ) : (
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No notifications.</CardContent>
        )}
      </Card>
    </div>
  );
}
