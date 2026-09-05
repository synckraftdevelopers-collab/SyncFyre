"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SubStatusCounts } from "@/components/members/membership-filter-popover";

interface FilterOption {
  id: string;
  name: string;
}

interface MemberFiltersProps {
  branches: FilterOption[];
  plans: FilterOption[];
  trainers: FilterOption[];
  subscriptionCounts: SubStatusCounts;
  basePath?: string;
}

const GENDER_OPTIONS = [
  { id: "male", name: "Male" },
  { id: "female", name: "Female" },
  { id: "other", name: "Other" },
];

const MEMBERSHIP_STATUS_OPTIONS = [
  { id: "active", name: "Active" },
  { id: "expired", name: "Expired" },
  { id: "pending", name: "Pending" },
  { id: "paused", name: "Paused" },
  { id: "cancelled", name: "Cancelled" },
];

const SUBSCRIPTION_STATUS_OPTIONS = [
  { id: "active", name: "Active" },
  { id: "expired", name: "Expired" },
  { id: "pending", name: "Pending" },
  { id: "paused", name: "Paused" },
  { id: "cancelled", name: "Cancelled" },
] as const;

const MEMBER_STATUS_OPTIONS = [
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
];

const ATTENDANCE_OPTIONS = [
  { id: "present", name: "Present Today" },
  { id: "absent", name: "Absent Today" },
];

const FINANCIAL_YEARS = [
  { id: "2025-2026", label: "2025-2026" },
  { id: "2026-2027", label: "2026-2027" },
] as const;

export function MemberFilters({
  branches,
  plans,
  trainers,
  subscriptionCounts,
  basePath = "/admin/members",
}: MemberFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [, startTransition] = useTransition();

  const push = useCallback(
    (params: URLSearchParams) => {
      params.set("page", "1");
      startTransition(() => {
        router.push(`${basePath}?${params.toString()}`);
      });
    },
    [router, basePath],
  );

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    push(params);
  }

  function clearAll() {
    push(new URLSearchParams());
  }

  const hasFilters = Array.from(sp.entries()).some(
    ([k]) => k !== "page",
  );

  return (
    <div className="border-b">
      {/* Primary search row */}
      <div className="flex flex-wrap items-center gap-2.5 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            key={sp.get("q") ?? ""}
            name="q"
            defaultValue={sp.get("q") ?? ""}
            className="pl-9"
            placeholder="Search name, member code, phoneÃ¢â‚¬Â¦"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                update("q", v);
              }
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (sp.get("q") ?? "")) update("q", v);
            }}
          />
          {sp.get("q") && (
            <button
              onClick={() => update("q", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <FilterSelect
          value={sp.get("status") ?? "active"}
          onChange={(v) => update("status", v)}
          placeholder="Member Status"
          options={MEMBER_STATUS_OPTIONS}
        />
        <FinancialYearFilters
          selected={sp.get("financial_year") ?? ""}
          onSelect={(year) => update("financial_year", year)}
        />
        <SubscriptionStatusFilters
          counts={subscriptionCounts}
          selected={sp.get("sub_status") ?? ""}
          onSelect={(status) => update("sub_status", status)}
        />
        <FilterSelect
          value={sp.get("branch") ?? "all"}
          onChange={(v) => update("branch", v)}
          placeholder="Branch"
          options={branches}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn("gap-1.5", showAdvanced && "bg-muted")}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {hasFilters && (
            <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
              {Array.from(sp.keys()).filter((k) => k !== "page").length}
            </span>
          )}
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground">
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-3 border-t bg-muted/30 px-4 py-3">
          <FilterSelect
            value={sp.get("plan") ?? "all"}
            onChange={(v) => update("plan", v)}
            placeholder="Plan"
            options={plans}
          />
          <FilterSelect
            value={sp.get("trainer") ?? "all"}
            onChange={(v) => update("trainer", v)}
            placeholder="Trainer"
            options={trainers}
          />
          <FilterSelect
            value={sp.get("gender") ?? "all"}
            onChange={(v) => update("gender", v)}
            placeholder="Gender"
            options={GENDER_OPTIONS}
          />
          <FilterSelect
            value={sp.get("attendance") ?? "all"}
            onChange={(v) => update("attendance", v)}
            placeholder="Attendance Today"
            options={ATTENDANCE_OPTIONS}
          />

          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs whitespace-nowrap">Join from</span>
            <input
              type="date"
              value={sp.get("join_from") ?? ""}
              onChange={(e) => update("join_from", e.target.value)}
              className="h-9 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs whitespace-nowrap">Join to</span>
            <input
              type="date"
              value={sp.get("join_to") ?? ""}
              onChange={(e) => update("join_to", e.target.value)}
              className="h-9 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs whitespace-nowrap">Expires from</span>
            <input
              type="date"
              value={sp.get("exp_from") ?? ""}
              onChange={(e) => update("exp_from", e.target.value)}
              className="h-9 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs whitespace-nowrap">Expires to</span>
            <input
              type="date"
              value={sp.get("exp_to") ?? ""}
              onChange={(e) => update("exp_to", e.target.value)}
              className="h-9 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialYearFilters({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (year: string) => void;
}) {
  const [optimistic, setOptimistic] = useState(selected);

  useEffect(() => { setOptimistic(selected); }, [selected]);

  function handleSelect(id: string) {
    const next = optimistic === id ? "" : id;
    setOptimistic(next);
    onSelect(next);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background p-1" aria-label="Filter members by financial year">
      {FINANCIAL_YEARS.map((year) => {
        const isSelected = optimistic === year.id;
        return (
          <button
            key={year.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => handleSelect(year.id)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {year.label}
          </button>
        );
      })}
    </div>
  );
}
function SubscriptionStatusFilters({
  counts,
  selected,
  onSelect,
}: {
  counts: SubStatusCounts;
  selected: string;
  onSelect: (status: string) => void;
}) {
  // Local optimistic state — updates instantly on click before URL param settles
  const [optimistic, setOptimistic] = useState<string>(selected);

  // Keep in sync when URL param changes (navigation, back/forward)
  useEffect(() => {
    setOptimistic(selected);
  }, [selected]);

  function handleSelect(id: string) {
    // Toggle off if already selected
    const next = optimistic === id ? "" : id;
    setOptimistic(next);
    onSelect(next);
  }

  const STATUS_STYLE: Record<string, { active: string; dot: string }> = {
    active:    { active: "bg-emerald-600 text-white border-emerald-600", dot: "bg-emerald-500" },
    expired:   { active: "bg-red-600    text-white border-red-600",    dot: "bg-red-500"     },
    pending:   { active: "bg-amber-500  text-white border-amber-500",  dot: "bg-amber-500"   },
    paused:    { active: "bg-blue-600   text-white border-blue-600",   dot: "bg-blue-500"    },
    cancelled: { active: "bg-gray-600   text-white border-gray-600",   dot: "bg-gray-400"    },
  };

  return (
    <div
      className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border bg-background p-1"
      aria-label="Filter by membership status"
    >
      {SUBSCRIPTION_STATUS_OPTIONS.map((status) => {
        const isSelected = optimistic === status.id;
        const style = STATUS_STYLE[status.id];
        return (
          <button
            key={status.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => handleSelect(status.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isSelected
                ? style.active
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {/* colour dot */}
            <span className={cn("size-1.5 rounded-full flex-shrink-0", isSelected ? "bg-white" : style.dot)} />
            <span>{status.name}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                isSelected ? "bg-white/20" : "bg-muted",
              )}
            >
              {counts[status.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Inline select Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: FilterOption[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 appearance-none rounded-lg border bg-background pl-3 pr-7 text-sm outline-none focus:ring-2 focus:ring-primary/30",
          value && value !== "all" ? "border-primary/50 text-foreground" : "text-muted-foreground",
        )}
      >
        <option value="all">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
