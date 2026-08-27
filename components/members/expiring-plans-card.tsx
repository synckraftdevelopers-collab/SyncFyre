"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EXPIRY_QUICK_FILTERS } from "@/lib/member-expiry";

export function ExpiringPlansCard({ counts, selectedDays, basePath = "/admin/members", editableDays = false }: { counts: Record<number, number>; selectedDays?: number; basePath?: string; editableDays?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customDays, setCustomDays] = useState(String(selectedDays ?? 365));

  useEffect(() => {
    if (selectedDays !== undefined) setCustomDays(String(selectedDays));
  }, [selectedDays]);

  function applyFilter(days: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("expiring_within", String(days));
    params.delete("exp_from");
    params.delete("exp_to");
    params.set("sub_status", "active");
    params.set("status", "active");
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {EXPIRY_QUICK_FILTERS.map(({ days, label }) => {
        const isSelected = selectedDays === days;
        if (editableDays && days === 365) {
          const selectedCustomDays = selectedDays ?? 365;
          return (
            <form key={days} onSubmit={(event) => { event.preventDefault(); const nextDays = Number(customDays); if (Number.isInteger(nextDays) && nextDays >= 0 && nextDays <= 3650) applyFilter(nextDays); }} className="rounded-3xl border border-border/70 bg-background px-4 py-3 text-left transition-all focus-within:ring-2 focus-within:ring-primary">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Expiring within</p>
              <p className="mt-1 text-2xl font-bold">{(counts[selectedCustomDays] ?? counts[365] ?? 0).toLocaleString()}</p>
              <div className="mt-2 flex items-center gap-2">
                <input aria-label="Expiry period in days" type="number" min="0" max="3650" value={customDays} onChange={(event) => setCustomDays(event.target.value)} className="h-8 w-20 rounded-lg border bg-background px-2 text-xs" />
                <span className="text-xs font-medium text-primary">days</span>
                <button type="submit" className="ml-auto text-xs font-semibold text-primary hover:underline">Apply</button>
              </div>
            </form>
          );
        }
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
