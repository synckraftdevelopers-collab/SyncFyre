"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  name: string;
}

interface MemberFiltersProps {
  branches: FilterOption[];
  plans: FilterOption[];
  trainers: FilterOption[];
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

const MEMBER_STATUS_OPTIONS = [
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
];

const ATTENDANCE_OPTIONS = [
  { id: "present", name: "Present Today" },
  { id: "absent", name: "Absent Today" },
];

export function MemberFilters({
  branches,
  plans,
  trainers,
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
            placeholder="Search name, member code, phone…"
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
          value={sp.get("status") ?? "all"}
          onChange={(v) => update("status", v)}
          placeholder="Member Status"
          options={MEMBER_STATUS_OPTIONS}
        />
        <FilterSelect
          value={sp.get("sub_status") ?? "all"}
          onChange={(v) => update("sub_status", v)}
          placeholder="Membership"
          options={MEMBERSHIP_STATUS_OPTIONS}
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

// ─── Inline select ────────────────────────────────────────────────────────────

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
