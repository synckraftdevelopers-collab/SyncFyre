import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Notifications" };

export default async function TrainerNotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireUser(["trainer", "dietician", "diet-planner", "diet_planner"]);
  const sp = await searchParams;
  return <NotificationInbox portal="trainer" notificationsHref="/trainer/notifications" activeFilter={sp.filter} />;
}
