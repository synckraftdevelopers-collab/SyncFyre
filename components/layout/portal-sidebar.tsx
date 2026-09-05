"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navByPortal, portalLabel, type PortalKey } from "@/lib/nav";

interface PortalSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  desktopExpanded: boolean;
  portal: PortalKey;
}

export function PortalSidebar({
  mobileOpen, onMobileClose, desktopExpanded, portal,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const navigation = navByPortal[portal];
  const label = portalLabel[portal];

  return (
    <>
      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[#061a31]/70 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          onKeyDown={(event) => event.key === "Enter" && onMobileClose()}
        />
      )}

      <aside
        className={cn(
          "print:hidden",
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-[#071d38] text-white shadow-2xl",
          "transition-[width,transform] duration-300 ease-in-out",
          "w-[272px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          desktopExpanded ? "lg:w-[272px]" : "lg:w-[88px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-white/10",
            desktopExpanded ? "gap-3 px-4" : "gap-3 px-4 lg:justify-center",
          )}
        >
          <div
            className={cn(
              "shrink-0 rounded-lg bg-white px-2 py-1 transition-all duration-300",
              desktopExpanded ? "lg:scale-100 lg:opacity-100" : "lg:w-0 lg:scale-75 lg:px-0 lg:py-0 lg:opacity-0",
              "scale-100 opacity-100",
            )}
          >
            <Image
              src="/syncfyre-logo.png"
              width={88}
              height={42}
              alt="SyncFyre"
              className="h-7 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex-1" />
          <button
            onClick={onMobileClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            desktopExpanded ? "lg:max-h-12 lg:opacity-100" : "lg:max-h-0 lg:opacity-0",
            "max-h-12 opacity-100",
          )}
        >
          <p className="whitespace-nowrap px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[.22em] text-[#52c7ea]">
            {label}
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-2 py-3">
          {navigation.map(({ label: navLabel, href, icon: Icon, exact }) => {
            const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                title={navLabel}
                aria-label={navLabel}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl text-sm font-medium transition-all duration-150",
                  "min-h-[52px] text-white/70 hover:bg-white/8 hover:text-white",
                  desktopExpanded ? "px-3 py-3" : "px-3 py-3 lg:justify-center lg:px-0",
                  active && "bg-primary text-white shadow-[0_6px_18px_rgba(255,48,36,.2)] hover:bg-primary",
                )}
              >
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-2xl transition-all",
                    desktopExpanded ? "size-10" : "size-12 lg:size-12",
                    active ? "bg-white/12" : "bg-white/5 group-hover:bg-white/10",
                  )}
                >
                  <Icon
                    className={cn(
                      "shrink-0 transition-colors",
                      desktopExpanded ? "size-5" : "size-7 lg:size-7",
                      active ? "text-white" : "group-hover:text-[#52c7ea]",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap leading-none transition-all duration-300",
                    desktopExpanded ? "lg:block" : "lg:hidden",
                    "block",
                  )}
                >
                  {navLabel}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            desktopExpanded ? "lg:max-h-28 lg:opacity-100" : "lg:max-h-0 lg:opacity-0",
            "max-h-28 opacity-100",
          )}
        >
          <div className="mx-2 mb-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold text-white">One intelligent platform.</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
              Every member. Every payment. Every moving part.
            </p>
            <div className="mt-2 h-1 w-8 rounded-full bg-primary" />
          </div>
        </div>
      </aside>
    </>
  );
}
