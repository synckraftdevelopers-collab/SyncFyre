"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Tab = {
  id: string;
  label: string;
  content?: React.ReactNode;
};

interface MemberProfileTabsProps {
  tabs: Tab[];
  activeTab?: string;
  defaultTab?: string;
  memberId?: string;
  baseUrl?: string;
}

export function MemberProfileTabs({
  tabs,
  activeTab,
  defaultTab,
  memberId,
  baseUrl,
}: MemberProfileTabsProps) {
  const currentTab = activeTab ?? defaultTab ?? tabs[0]?.id;
  const baseHref = baseUrl ?? (memberId ? `/admin/members/${memberId}` : "");

  const activeTabObj = tabs.find((t) => t.id === currentTab);

  return (
    <>
      <div className="overflow-x-auto border-b">
        <div className="flex min-w-max">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`${baseHref}?tab=${t.id}`}
              scroll={false}
              className={cn(
                "relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                currentTab === t.id
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {currentTab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </div>
      </div>
      {activeTabObj?.content !== undefined && (
        <div className="p-5">{activeTabObj.content}</div>
      )}
    </>
  );
}
