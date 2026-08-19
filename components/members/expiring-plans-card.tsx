"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EXPIRY_QUICK_FILTERS } from "@/lib/member-expiry";

export function ExpiringPlansCard({ counts, selectedDays, basePath = "/admin/members" }: { counts: Record<number, number>; selectedDays?: number; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function applyFilter(days: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("expiring_within", String(days));
    params.delete("exp_from");
    params.delete("exp_to");
    params.set("sub_status", "active");
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {EXPIRY_QUICK_FILTERS.map(({ days, label }) => {
        const isSelected = selectedDays === days;
        return (
          <button key={days} type="button" onClick={() => applyFilter(days)} aria-pressed={isSelected}
            className={`rounded-3xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-background hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"}`}>
            <p className={`text-xs uppercase tracking-[0.14em] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>Expiring</p>
            <p className="mt-1 text-2xl font-bold">{(counts[days] ?? 0).toLocaleString()}</p>
            <p className={`mt-1 text-xs font-medium ${isSelected ? "text-primary-foreground" : "text-primary"}`}>{label}</p>
          </button>
        );
      })}
    </div>
  );
}
