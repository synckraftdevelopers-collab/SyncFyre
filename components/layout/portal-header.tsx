"use client";
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, User } from "lucide-react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { logoutAction } from "@/app/(auth)/actions";
import { useId } from "react";

export function PortalHeader({
  name,
  role,
  onMenu,
  unreadCount = 0,
  settingsHref = "/admin/settings",
  notificationsHref = "/admin/notifications",
  searchAction = "/admin/members",
  searchPlaceholder = "Search members...",
}: {
  name: string;
  role: string;
  onMenu: () => void;
  unreadCount?: number;
  settingsHref?: string;
  notificationsHref?: string;
  searchAction?: string;
  searchPlaceholder?: string;
}) {
  const triggerId = useId();

  return (
    <header className="print:hidden sticky top-0 z-30 flex h-20 min-w-0 items-center gap-2 border-b border-border/70 bg-background/88 px-4 backdrop-blur-xl md:gap-3 md:px-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenu}
        aria-label="Toggle navigation"
        className="shrink-0"
      >
        <Menu className="size-5" />
      </Button>

      <span className="truncate font-bold text-base tracking-tight lg:hidden">SyncFyre</span>

      <form action={searchAction} className="relative hidden min-w-0 max-w-lg flex-1 md:block">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          className="h-11 rounded-xl border-0 bg-muted/75 pl-11 shadow-none focus-visible:ring-1"
          placeholder={searchPlaceholder}
        />
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Search" className="md:hidden">
          <Search className="size-5" />
        </Button>
        <ThemeToggle />

        <form action={logoutAction}>
          <button
            type="submit"
            title="Sign out"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40",
            )}
            aria-label="Sign out"
          >
            <LogOut className="size-5" />
          </button>
        </form>

        <Link
          href={notificationsHref}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              id={triggerId}
              className="ml-2 flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Open profile menu"
              suppressHydrationWarning
            >
              <div className="grid size-9 place-items-center rounded-xl bg-[#071d38] text-sm font-bold text-white dark:bg-primary">
                {initials(name)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-36 truncate text-sm font-semibold leading-tight">{name}</p>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {role}
                </p>
              </div>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-52 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-[0_16px_40px_rgba(7,29,56,.14)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              <div className="mb-1 border-b border-border px-3 py-2">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{role}</p>
              </div>

              <DropdownMenu.Item asChild>
                <Link
                  href={settingsHref}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none hover:bg-muted focus:bg-muted"
                >
                  <User className="size-4 text-muted-foreground" />
                  Profile &amp; settings
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href={settingsHref}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none hover:bg-muted focus:bg-muted"
                >
                  <Settings className="size-4 text-muted-foreground" />
                  Application settings
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

              <DropdownMenu.Item asChild>
                <form action={logoutAction} className="w-full">
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </form>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
