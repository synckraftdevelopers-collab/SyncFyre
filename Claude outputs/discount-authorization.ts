/**
 * discount-authorization.ts
 *
 * "Role-based discount authorization" — one of the Advanced Membership
 * Operations gated behind the `advanced_membership` SaaS feature (Growth+;
 * see lib/entitlements/registry.ts). Product decision (confirmed with the
 * user): threshold-based — a discount above a fixed percentage requires
 * the person completing the sale to already hold an authorizing role
 * (owner, admin, or manager). There is no secondary approval/override
 * step or PIN entry: reception simply cannot apply a discount above the
 * threshold at all, full stop — an owner/admin/manager has to be the one
 * signed in and completing that specific sale. This is deliberately the
 * simplest mechanism that's still enforceable purely from the signed-in
 * user's own session role, with nothing else to configure, no secondary
 * credential to check, and no override workflow to misuse.
 *
 * Scoped to the DISCRETIONARY portion of a discount only. A membership
 * plan's own configured `discount_percent` (set up by an admin/owner when
 * the plan itself was created in Settings) is already authorized by
 * construction — every sale of that plan carries it automatically. Only
 * the *extra* amount a staff member keys in on top of that, at the moment
 * of a specific sale, counts toward this threshold. See callers
 * (services/membership-plan.service.ts, app/actions/member-actions.ts,
 * app/api/[resource]/route.ts) for how each one isolates that portion
 * from its own total discount figure.
 */

export const DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT = 20;

const AUTHORIZING_ROLES = new Set(["owner", "admin", "manager", "super_admin"]);

export interface DiscountAuthorizationCheck {
  allowed: boolean;
  /** The discretionary portion as a percentage of listPrice, for logging/messaging. */
  manualDiscountPercent: number;
  /** Null when allowed; a user-facing reason string otherwise. */
  reason: string | null;
}

export interface DiscountAuthorizationInput {
  /** The plan's pre-discount list price (never the already-discounted total). */
  listPrice: number;
  /**
   * The staff-entered, discretionary discount amount only — never a plan's
   * own pre-configured discount. Callers are responsible for subtracting
   * that out first; see the module doc comment.
   */
  manualDiscountAmount: number;
  /** The role slug of the user completing the sale (profile.role?.slug). */
  performedByRole: string | null | undefined;
}

export function checkDiscountAuthorization(input: DiscountAuthorizationInput): DiscountAuthorizationCheck {
  const manualDiscountPercent =
    input.listPrice > 0 && input.manualDiscountAmount > 0
      ? (input.manualDiscountAmount / input.listPrice) * 100
      : 0;

  if (manualDiscountPercent <= DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT) {
    return { allowed: true, manualDiscountPercent, reason: null };
  }

  if (input.performedByRole && AUTHORIZING_ROLES.has(input.performedByRole)) {
    return { allowed: true, manualDiscountPercent, reason: null };
  }

  return {
    allowed: false,
    manualDiscountPercent,
    reason: `A discount above ${DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT}% needs an owner, admin, or manager to complete this sale.`,
  };
}
