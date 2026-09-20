"use client";
import { ChevronDown, Menu, Search, Settings, User, LogOut, X } from "lucide-react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBellDropdown } from "@/components/notifications/notification-bell-dropdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { HistoryBackButton } from "@/components/ui/history-back-button";
import { logoutAction } from "@/app/(auth)/actions";
import { useId, useRef, useState } from "react";
import { RealtimeGreetingClock } from "@/components/layout/realtime-greeting-clock";
import type { NotificationPortal } from "@/lib/notifications/destination";

export function PortalHeader({
  name,
  role,
  onMenu,
  unreadCount = 0,
  profileHref = "/admin/settings?tab=profile",
  settingsHref = "/admin/settings?tab=application",
  notificationsHref = "/admin/notifications",
  portal = "admin",
  searchAction = "/admin/members",
  searchPlaceholder = "Search members...",
  tenantTimezone,
  branchTimezone,
}: {
  name: string;
  role: string;
  onMenu: () => void;
  unreadCount?: number;
  profileHref?: string;
  settingsHref?: string;
  notificationsHref?: string;
  portal?: NotificationPortal;
  searchAction?: string;
  searchPlaceholder?: string;
  tenantTimezone?: string | null;
  branchTimezone?: string | null;
}) {
  const triggerId = useId();
  const menuLogoutFormRef = useRef<HTMLFormElement>(null);
  const backHrefByPortal: Record<string, string> = {
    admin: "/admin/dashboard",
    reception: "/reception/dashboard",
    trainer: "/trainer/dashboard",
    member: "/member/dashboard",
  };
  // The mobile/PWA search entry point below md is an icon button that opens
  // this same searchAction form full-width, in place of the rest of the
  // header — it does not call a different search path than desktop, it just
  // makes the existing one reachable on a small screen. See
  // docs/PWA_SEARCH_FIX.md: the button previously had no onClick at all, so
  // tapping it (in a fresh browser, mobile responsive mode, or the installed
  // PWA) did nothing.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  if (mobileSearchOpen) {
    return (
      <header className="print:hidden sticky top-0 z-30 flex min-h-20 min-w-0 items-center gap-2 border-b border-border/70 bg-background/88 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
        <form action={searchAction} className="relative flex min-w-0 flex-1 items-center gap-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            enterKeyHint="search"
            autoFocus
            className="h-11 min-w-0 flex-1 rounded-xl border-0 bg-muted/75 pl-11 shadow-none focus-visible:ring-1"
            placeholder={searchPlaceholder}
          />
        </form>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close search"
          className="shrink-0"
          onClick={() => setMobileSearchOpen(false)}
        >
          <X className="size-5" />
        </Button>
      </header>
    );
  }

  return (
    <header className="print:hidden sticky top-0 z-30 flex min-h-20 min-w-0 items-center gap-2 border-b border-border/70 bg-background/88 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:gap-3 md:px-8">
      <HistoryBackButton fallbackHref={backHrefByPortal[portal] ?? "/"} className="shrink-0" />
      <Button variant="ghost" size="icon" onClick={onMenu} aria-label="Toggle navigation" className="shrink-0">
        <Menu className="size-5" />
      </Button>

      <span className="hidden truncate font-bold text-base tracking-tight sm:block lg:hidden">SyncFyre</span>

      <form action={searchAction} className="relative hidden min-w-0 max-w-lg flex-1 md:block">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" className="h-11 rounded-xl border-0 bg-muted/75 pl-11 shadow-none focus-visible:ring-1" placeholder={searchPlaceholder} />
      </form>

      {/* Greeting/clock — visible in header on md+ where there's room */}
      <span className="hidden md:contents">
        <RealtimeGreetingClock tenantTimezone={tenantTimezone} branchTimezone={branchTimezone} />
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Search"
          className="md:hidden"
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="size-5" />
        </Button>
        <ThemeToggle />

        <form action={logoutAction}>
          <button
            type="submit"
            title="Sign Out"
            aria-label="Sign Out"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40",
            )}
          >
            <LogOut className="size-5" />
          </button>
        </form>

        <NotificationBellDropdown notificationsHref={notificationsHref} portal={portal} />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              id={triggerId}
              className="ml-2 flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Open profile menu"
              suppressHydrationWarning
            >
              <div className="grid size-9 place-items-center rounded-xl bg-[#071d38] text-sm font-bold text-white dark:bg-primary">{initials(name)}</div>
              <div className="hidden text-left sm:block">
                <p className="max-w-36 truncate text-sm font-semibold leading-tight">{name}</p>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{role}</p>
              </div>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-52 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-[0_16px_40px_rgba(7,29,56,.14)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
              <div className="mb-1 border-b border-border px-3 py-2">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{role}</p>
              </div>

              <DropdownMenu.Item asChild>
                <Link href={profileHref} className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none hover:bg-muted focus:bg-muted">
                  <User className="size-4 text-muted-foreground" />
                  Profile Settings
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link href={settingsHref} className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none hover:bg-muted focus:bg-muted">
                  <Settings className="size-4 text-muted-foreground" />
                  Application Settings
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

              <form ref={menuLogoutFormRef} action={logoutAction} className="hidden">
                <button type="submit">Sign Out</button>
              </form>
              <DropdownMenu.Item
                className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
                onSelect={(event) => {
                  event.preventDefault();
                  menuLogoutFormRef.current?.requestSubmit();
                }}
              >
                <LogOut className="size-4" />
                Sign Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
