export type PlanType = "individual" | "couple";

/**
 * Determines a plan's type from its raw DB value, with a name-based
 * fallback for use before migration 0046 (which adds the real
 * membership_plans.plan_type column) has been applied.
 *
 * Before that migration, every schema-fallback read in this app drops the
 * plan_type column entirely rather than erroring out (see
 * lib/supabase/select-fallback.ts) — so `raw` comes back `undefined`, and a
 * plan created with the "Couple" radio selected has nowhere to persist that
 * choice yet (the insert silently drops the field too, see
 * lib/supabase/insert-fallback.ts usage in membership-plan-actions.ts).
 *
 * To avoid the couple-plan partner picker staying invisible for gyms who
 * haven't run the migration yet, this falls back to checking the plan's
 * name for the word "couple" (case-insensitive) whenever the real column is
 * simply absent. It does NOT override an explicit "individual" — once the
 * migration has run and plan_type is a real, always-present column, `raw`
 * is always the literal string "individual" or "couple" and this heuristic
 * is never consulted.
 */
export function inferPlanType(raw: unknown, name?: string | null): PlanType {
  if (raw === "couple") return "couple";
  if (raw === "individual") return "individual";
  if (name && /couple/i.test(name)) return "couple";
  return "individual";
}
