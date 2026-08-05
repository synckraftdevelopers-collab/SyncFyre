"use client";
import { useState } from "react";
import { PortalHeader } from "@/components/layout/portal-header";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import type { PortalKey } from "@/lib/nav";

export type { PortalKey };

export function PortalShell({
  children,
  name,
  role,
  portal,
  settingsHref,
  notificationsHref,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  /** Plain string — safe to pass across the Server→Client boundary */
  portal: PortalKey;
  settingsHref?: string;
  notificationsHref?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <PortalSidebar
        open={open}
        onClose={() => setOpen(false)}
        portal={portal}
      />
      <div className="lg:pl-72">
        <PortalHeader
          name={name}
          role={role}
          onMenu={() => setOpen(true)}
          settingsHref={settingsHref}
          notificationsHref={notificationsHref}
        />
        <main className="mx-auto max-w-[1600px] p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
