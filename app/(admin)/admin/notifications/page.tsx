import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Notifications" };

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireUser(["owner", "admin", "manager"]);
  const sp = await searchParams;
  return <NotificationInbox portal="admin" notificationsHref="/admin/notifications" activeFilter={sp.filter} />;
}
