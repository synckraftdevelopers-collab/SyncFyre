"use client";
import { useState, useCallback } from "react";
import { PortalHeader } from "@/components/layout/portal-header";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import type { PortalKey } from "@/lib/nav";

export type { PortalKey };

const searchActionByPortal: Record<PortalKey, string> = {
  admin: "/admin/members",
  reception: "/reception/members",
  trainer: "/trainer/members",
  member: "/member/profile",
};

const searchPlaceholderByPortal: Record<PortalKey, string> = {
  admin: "Search members...",
  reception: "Search members...",
  trainer: "Search members...",
  member: "Search your records...",
};

const profileHrefByPortal: Record<PortalKey, string> = {
  admin: "/admin/settings?tab=profile",
  reception: "/reception/settings",
  trainer: "/trainer/settings",
  member: "/member/profile",
};

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
  portal: PortalKey;
  settingsHref?: string;
  notificationsHref?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);

  const handleMenu = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileOpen((value) => !value);
      return;
    }
    setDesktopExpanded((value) => !value);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PortalSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} desktopExpanded={desktopExpanded} portal={portal} />
      <div className={desktopExpanded ? "transition-[padding] duration-300 ease-in-out lg:pl-[272px] print:p-0" : "transition-[padding] duration-300 ease-in-out lg:pl-16 print:p-0"}>
        <PortalHeader
          name={name}
          role={role}
          onMenu={handleMenu}
          profileHref={profileHrefByPortal[portal]}
          settingsHref={settingsHref ?? profileHrefByPortal[portal]}
          notificationsHref={notificationsHref}
          searchAction={searchActionByPortal[portal]}
          searchPlaceholder={searchPlaceholderByPortal[portal]}
        />
        <main className="mx-auto max-w-[1600px] min-w-0 p-4 md:p-6 print:p-0 print:max-w-none">{children}</main>
      </div>
    </div>
  );
}
