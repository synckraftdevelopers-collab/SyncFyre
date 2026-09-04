"use client";

import { useState, useCallback } from "react";
import { PortalHeader } from "@/components/layout/portal-header";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { NotificationProvider, useNotifications } from "@/components/notifications/notification-provider";
import { LoginWelcomeDialog } from "@/components/layout/login-welcome-dialog";
import type { PortalKey } from "@/lib/nav";
import type { UserRole } from "@/types";

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

function PortalShellFrame({
  children,
  name,
  role,
  portal,
  settingsHref,
  notificationsHref,
  tenantTimezone,
  branchTimezone,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  portal: PortalKey;
  settingsHref?: string;
  notificationsHref?: string;
  tenantTimezone?: string | null;
  branchTimezone?: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const { unreadCount } = useNotifications();

  const handleMenu = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileOpen((value) => !value);
      return;
    }
    setDesktopExpanded((value) => !value);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LoginWelcomeDialog />
      <PortalSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} desktopExpanded={desktopExpanded} portal={portal} />
      <div className={desktopExpanded ? "transition-[padding] duration-300 ease-in-out lg:pl-[272px] print:p-0" : "transition-[padding] duration-300 ease-in-out lg:pl-16 print:p-0"}>
        <PortalHeader
          name={name}
          role={role}
          onMenu={handleMenu}
          portal={portal}
          profileHref={profileHrefByPortal[portal]}
          settingsHref={settingsHref ?? profileHrefByPortal[portal]}
          notificationsHref={notificationsHref}
          searchAction={searchActionByPortal[portal]}
          searchPlaceholder={searchPlaceholderByPortal[portal]}
          unreadCount={unreadCount}
          tenantTimezone={tenantTimezone}
          branchTimezone={branchTimezone}
        />
        <main className="mx-auto max-w-[1600px] min-w-0 p-4 pb-24 md:p-6 lg:pb-6 print:p-0 print:max-w-none">{children}</main>
        <MobileBottomNav portal={portal} onMore={handleMenu} />
      </div>
    </div>
  );
}

export function PortalShell({
  children,
  name,
  role,
  portal,
  settingsHref,
  notificationsHref,
  initialUnreadCount,
  userId,
  branchId,
  tenantId,
  tenantTimezone,
  branchTimezone,
  userRole,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  portal: PortalKey;
  settingsHref?: string;
  notificationsHref?: string;
  initialUnreadCount: number;
  userId: string;
  branchId?: string | null;
  tenantId?: string | null;
  tenantTimezone?: string | null;
  branchTimezone?: string | null;
  userRole?: UserRole | null;
}) {
  return (
    <NotificationProvider
      initialUnreadCount={initialUnreadCount}
      scope={{ userId, branchId, tenantId, role: userRole }}
      portal={portal}
      notificationsHref={notificationsHref}
    >
      <PortalShellFrame
        name={name}
        role={role}
        portal={portal}
        settingsHref={settingsHref}
        notificationsHref={notificationsHref}
        tenantTimezone={tenantTimezone}
        branchTimezone={branchTimezone}
      >
        {children}
      </PortalShellFrame>
    </NotificationProvider>
  );
}
