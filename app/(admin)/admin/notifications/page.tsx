import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markNotificationReadAction } from "@/app/actions/notification-actions";

export const metadata = { title: "Notifications" };
export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const sp = await searchParams; const profile = await requireUser(["admin", "manager"]); const supabase = await createClient();
  let query = supabase.from("notifications").select("*").eq("branch_id", profile.branch_id).order("created_at", { ascending: false }).limit(50);
  if (sp.filter === "unread") query = query.is("read_at", null);
  const { data, error } = await query; if (error) throw new Error(error.message);
  const notifications = data ?? []; const unread = notifications.filter((item) => !item.read_at).length;
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold">Notifications</h1>{unread > 0 && <Badge variant="warning">{unread} unread</Badge>}</div><p className="text-sm text-muted-foreground">Review messages sent to your branch.</p></div><Link href="/admin/notifications/new" className={buttonVariants({ className: "ml-auto" })}><Plus className="size-4" /> Create Notification</Link></div><div className="flex gap-2"><Link href="/admin/notifications" className={buttonVariants({ variant: sp.filter !== "unread" ? "default" : "outline", size: "sm" })}>All</Link><Link href="/admin/notifications?filter=unread" className={buttonVariants({ variant: sp.filter === "unread" ? "default" : "outline", size: "sm" })}>Unread</Link></div><Card>{notifications.length ? <div className="divide-y">{notifications.map((item) => <div key={item.id} className={`flex gap-3 p-4 ${!item.read_at ? "bg-primary/5" : ""}`}><span className={`mt-2 size-2 shrink-0 rounded-full ${!item.read_at ? "bg-primary" : "bg-transparent"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className={`text-sm ${!item.read_at ? "font-bold" : "font-medium"}`}>{item.title}</p><Badge variant="outline">{item.type}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.message}</p><p className="mt-2 text-xs text-muted-foreground">Channels: {(item.channels ?? []).join(", ") || "—"} · Scheduled: {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString("en-IN") : "—"} · Sent: {item.sent_at ? new Date(item.sent_at).toLocaleString("en-IN") : "Not sent"}</p></div>{!item.read_at && <form action={markNotificationReadAction.bind(null, item.id)}><button className={buttonVariants({ variant: "outline", size: "sm" })}>Mark read</button></form>}</div>)}</div> : <CardContent className="grid min-h-64 place-items-center text-center"><div><Bell className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No notifications found</p><p className="text-sm text-muted-foreground">Create a notification or change the filter.</p></div></CardContent>}</Card></div>;
}
