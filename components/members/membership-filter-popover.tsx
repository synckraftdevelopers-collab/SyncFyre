"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubStatusCounts {
  active: number;
  expired: number;
  pending: number;
  paused: number;
  cancelled: number;
}

const STATUS_CONFIG = [
  { id: "active",    label: "Active",    dot: "bg-emerald-500", text: "text-emerald-700", bg: "hover:bg-emerald-50" },
  { id: "expired",   label: "Expired",   dot: "bg-red-500",     text: "text-red-700",     bg: "hover:bg-red-50"     },
  { id: "pending",   label: "Pending",   dot: "bg-amber-500",   text: "text-amber-700",   bg: "hover:bg-amber-50"   },
  { id: "paused",    label: "Paused",    dot: "bg-blue-500",    text: "text-blue-700",    bg: "hover:bg-blue-50"    },
  { id: "cancelled", label: "Cancelled", dot: "bg-gray-400",    text: "text-gray-600",    bg: "hover:bg-gray-50"    },
] as const;

type StatusId = (typeof STATUS_CONFIG)[number]["id"];

interface MembershipFilterPopoverProps {
  counts: SubStatusCounts;
  basePath?: string;
}

export function MembershipFilterPopover({
  counts,
  basePath = "/admin/members",
}: MembershipFilterPopoverProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = (sp.get("sub_status") ?? "") as StatusId | "";
  const currentConfig = STATUS_CONFIG.find((s) => s.id === current);

  // Close on outside click or Escape
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(id: StatusId | "") {
    const params = new URLSearchParams(sp.toString());
    if (id) params.set("sub_status", id);
    else params.delete("sub_status");
    params.set("page", "1");
    setOpen(false);
    startTransition(() => router.push(`${basePath}?${params.toString()}`));
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Membership filter"
        aria-expanded={open}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border bg-background pl-3 pr-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30",
          current ? "border-primary/50 text-foreground" : "text-muted-foreground hover:border-border/80",
        )}
      >
        {current && currentConfig ? (
          <>
            <span className={cn("size-2 rounded-full", currentConfig.dot)} />
            <span>{currentConfig.label}</span>
            <ChevronDown className="size-3.5" />
          </>
        ) : (
          <>
            <span>Membership</span>
            <ChevronDown className="size-3.5" />
          </>
        )}
      </button>

      {/* Popover card */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-2xl border bg-background shadow-[0_8px_30px_rgba(0,0,0,.12)] overflow-hidden">
          <div className="border-b px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Membership Status
            </p>
          </div>

          <div className="p-1.5 space-y-0.5">
            {STATUS_CONFIG.map((s) => {
              const count = counts[s.id as keyof SubStatusCounts] ?? 0;
              const isSelected = current === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => select(s.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors",
                    s.bg,
                    isSelected && "ring-2 ring-primary/30 bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn("size-2.5 rounded-full flex-shrink-0", s.dot)} />
                    <span className={cn("font-medium", isSelected ? "text-primary" : s.text)}>
                      {s.label}
                    </span>
                  </div>
                  <span className={cn(
                    "tabular-nums text-xs font-semibold rounded-full px-2 py-0.5",
                    count > 0 ? `${s.bg.replace("hover:", "")} ${s.text}` : "text-muted-foreground",
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {current && (
            <div className="border-t px-3 py-2">
              <button
                onClick={() => select("")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filter ×
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
