"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { navByPortal, type PortalKey } from "@/lib/nav";
import { cn } from "@/lib/utils";

const primaryLabels: Record<PortalKey, string[]> = {
  admin: ["Dashboard", "Members", "Attendance", "Payments"],
  reception: ["Dashboard", "Members", "Attendance", "Payments"],
  trainer: ["Dashboard", "My Members", "Appointments", "Workouts"],
  member: ["Dashboard", "Membership", "Attendance", "My Workouts"],
};

export function MobileBottomNav({ portal, onMore }: { portal: PortalKey; onMore: () => void }) {
  const pathname = usePathname();
  const items = navByPortal[portal].filter((item) => primaryLabels[portal].includes(item.label)).slice(0, 4);
  return <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(7,29,56,.08)] backdrop-blur lg:hidden print:hidden">{items.map(({ label, href, icon: Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}><Icon className="size-5" /><span className="max-w-[68px] truncate">{label}</span></Link>; })}<button type="button" onClick={onMore} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-muted-foreground"><MoreHorizontal className="size-5" /><span>More</span></button></nav>;
}