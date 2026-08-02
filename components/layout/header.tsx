"use client";
import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function Header({ name, role, onMenu }: { name: string; role: string; onMenu: () => void }) {
  return <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-border/70 bg-background/88 px-4 backdrop-blur-xl md:px-8">
    <Button variant="ghost" size="icon" onClick={onMenu} className="lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></Button>
    <form action="/members" className="relative hidden max-w-lg flex-1 md:block"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input name="q" className="h-11 rounded-xl border-0 bg-muted/75 pl-11 shadow-none focus-visible:ring-1" placeholder="Search members, payments or attendance..." /></form>
    <div className="ml-auto flex items-center gap-1">
      <ThemeToggle />
      <Link href="/notifications" className={cn(buttonVariants({variant:"ghost",size:"icon"}),"relative")} aria-label="Notifications"><Bell className="size-5"/><span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" /></Link>
      <div className="ml-2 grid size-10 place-items-center rounded-xl bg-[#071d38] text-sm font-bold text-white dark:bg-primary">{initials(name)}</div>
      <div className="hidden sm:block"><p className="max-w-36 truncate text-sm font-semibold">{name}</p><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{role}</p></div>
    </div>
  </header>;
}