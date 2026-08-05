"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navByPortal, portalLabel, type PortalKey } from "@/lib/nav";

export function PortalSidebar({
  open,
  onClose,
  portal,
}: {
  open: boolean;
  onClose: () => void;
  portal: PortalKey;
}) {
  const pathname = usePathname();
  const navigation = navByPortal[portal];
  const label = portalLabel[portal];

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[#061a31]/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#071d38] text-white shadow-2xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-24 items-center border-b border-white/10 px-6">
          <div className="rounded-xl bg-white px-3 py-1.5">
            <Image
              src="/syncfyre-logo.png"
              width={154}
              height={74}
              alt="SyncFyre"
              className="h-12 w-auto object-contain"
              priority
            />
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Portal label */}
        <div className="px-6 pb-3 pt-6 text-[10px] font-semibold uppercase tracking-[.22em] text-[#52c7ea]">
          {label}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navigation.map(({ label: navLabel, href, icon: Icon }) => {
            const active =
              pathname === href ||
              (href.split("/").length > 2 && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/62 transition-all hover:bg-white/7 hover:text-white",
                  active &&
                    "bg-primary text-white shadow-[0_8px_22px_rgba(255,48,36,.22)] hover:bg-primary",
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px] transition-colors group-hover:text-[#52c7ea]",
                    active && "text-white group-hover:text-white",
                  )}
                />
                {navLabel}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-white">One intelligent platform.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">
            Every member. Every payment. Every moving part.
          </p>
          <div className="mt-3 h-1 w-10 rounded-full bg-primary" />
        </div>
      </aside>
    </>
  );
}
