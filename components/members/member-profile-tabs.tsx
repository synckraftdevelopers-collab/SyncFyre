"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Tab = {
  id: string;
  label: string;
};

interface MemberProfileTabsProps {
  tabs: Tab[];
  activeTab: string;
  memberId: string;
  /** Base path for tab links, e.g. "/admin/members" or "/reception/members" */
  basePath?: string;
}

export function MemberProfileTabs({
  tabs,
  activeTab,
  memberId,
  basePath = "/admin/members",
}: MemberProfileTabsProps) {
  return (
    <div className="overflow-x-auto border-b">
      <div className="flex min-w-max">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`${basePath}/${memberId}?tab=${t.id}`}
            scroll={false}
            className={cn(
              "relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === t.id
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {activeTab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
