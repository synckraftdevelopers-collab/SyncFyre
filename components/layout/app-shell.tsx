"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import type { CommercialPlanTier } from "@/lib/entitlements";

export function AppShell({ children, name, role, commercialPlanTier }: { children: React.ReactNode; name: string; role: string; commercialPlanTier?: CommercialPlanTier }) {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen"><Sidebar open={open} onClose={() => setOpen(false)} commercialPlanTier={commercialPlanTier} /><div className="lg:pl-72"><Header name={name} role={role} onMenu={() => setOpen(true)} /><main className="mx-auto max-w-[1600px] p-4 md:p-8">{children}</main></div></div>;
}
