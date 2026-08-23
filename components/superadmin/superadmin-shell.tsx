"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2, LayoutDashboard, Calendar, Users, Settings, CreditCard, ReceiptText, Cpu, ScrollText, BarChart3,
  LogOut, Menu, X, ChevronRight,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";

const nav = [
  { label: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { label: "Organizations", href: "/superadmin/tenants", icon: Building2 },
  { label: "Demo Requests", href: "/superadmin/demos", icon: Calendar },
  { label: "Subscriptions", href: "/superadmin/subscriptions", icon: CreditCard },
  { label: "Billing", href: "/superadmin/billing", icon: ReceiptText },
  { label: "All Users", href: "/superadmin/users", icon: Users },
  { label: "Device Integration", href: "/superadmin/devices", icon: Cpu },
  { label: "Reports", href: "/superadmin/reports", icon: BarChart3 },
  { label: "Audit Logs", href: "/superadmin/audit-logs", icon: ScrollText },
  { label: "Settings", href: "/superadmin/settings", icon: Settings },
];

export function SuperAdminShell({
  children,
  name,
  role,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#071d38] text-white shadow-2xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">
            SA
          </div>
          <div>
            <p className="text-sm font-bold leading-none">SyncFyre</p>
            <p className="text-[10px] text-[#52c7ea] font-semibold uppercase tracking-wider mt-0.5">
              Super Admin
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-white/60 hover:bg-white/10 lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-white shadow-[0_4px_14px_rgba(255,48,36,.3)]"
                    : "text-white/60 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
                {active && <ChevronRight className="ml-auto size-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-white">
              {initials(name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-xs text-white/50">{role}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="lg:pl-64">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 backdrop-blur-xl px-4 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-semibold">SyncFyre Super Admin</p>
        </header>

        <main className="mx-auto max-w-[1400px] p-4 pb-24 md:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(7,29,56,.08)] backdrop-blur lg:hidden">
        {nav.slice(0, 4).map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}><Icon className="size-5" /><span className="max-w-[68px] truncate">{label}</span></Link>;
        })}
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-muted-foreground"><Menu className="size-5" /><span>More</span></button>
      </nav>
    </div>
  );
}