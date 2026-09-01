import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Notifications" };

export default async function ReceptionNotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireUser(["reception"]);
  const sp = await searchParams;
  return <NotificationInbox portal="reception" notificationsHref="/reception/notifications" activeFilter={sp.filter} />;
}
