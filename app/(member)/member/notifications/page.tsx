import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Notifications" };

export default async function MemberNotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireUser(["member"]);
  const sp = await searchParams;
  return <NotificationInbox portal="member" notificationsHref="/member/notifications" activeFilter={sp.filter} />;
}
