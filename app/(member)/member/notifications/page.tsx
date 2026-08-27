import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationAutoRefresh } from "@/components/notifications/notification-auto-refresh";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markNotificationReadAction } from "@/app/actions/notification-actions";
import { buttonVariants } from "@/components/ui/button";

export default async function MemberNotificationsPage() {
  const profile = await requireUser(["member"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <NotificationAutoRefresh />
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Updates related to your membership, attendance, and payments.</p>
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
                {!notification.read_at ? (
                  <form action={markNotificationReadAction.bind(null, notification.id)}>
                    <button className={buttonVariants({ variant: "outline", size: "sm" })}>Mark read</button>
                  </form>
                ) : null}
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
