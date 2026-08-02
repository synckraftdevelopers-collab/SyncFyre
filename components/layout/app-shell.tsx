"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children, name, role }: { children: React.ReactNode; name: string; role: string }) {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen"><Sidebar open={open} onClose={() => setOpen(false)} /><div className="lg:pl-72"><Header name={name} role={role} onMenu={() => setOpen(true)} /><main className="mx-auto max-w-[1600px] p-4 md:p-8">{children}</main></div></div>;
}
