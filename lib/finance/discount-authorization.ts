/**
 * discount-authorization.ts
 *
 * 13-prompt sprint, Prompt 6: Role-Based Discount Authorization.
 *
 * Product decision: a fixed percentage threshold (20% of list price) above
 * which only an owner, admin, manager, or super_admin can complete the sale.
 * No secondary-authentication/PIN workflow, no "select an authorizer" step —
 * this purely gates on the *current signed-in user's own role*, matching how
 * every other role gate in this app already works (role-gated server
 * actions, no step-up auth anywhere). If a discount needs escalation, an
 * authorized person has to personally be the one completing that sale.
 *
 * The threshold only ever counts the *discretionary* portion of a discount —
 * the extra amount a staff member enters beyond whatever the plan's own
 * pre-configured discount_percent already provides. A plan's built-in
 * discount was already authorized by whoever configured that plan, so it is
 * never counted against this limit. Callers are responsible for backing that
 * portion out before calling this — see sellMembershipPlanToMember and the
 * /api/[resource] subscriptions POST handler for the two ways that's done.
 *
 * Pure function module, no I/O, so it's trivially unit-testable
 * (tests/discount-authorization.test.mts) and safe to call from any layer.
 */

export const DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT = 20;

export const AUTHORIZING_ROLES = new Set(["owner", "admin", "manager", "super_admin"]);

export interface DiscountAuthorizationInput {
  /** The plan's list price (before any discount). */
  listPrice: number;
  /** The discretionary portion of the discount only — not the plan's own baked-in discount_percent. */
  manualDiscountAmount: number;
  performedByRole: string | null | undefined;
}

export interface DiscountAuthorizationResult {
  allowed: boolean;
  /** The discretionary discount as a percentage of list price. 0 when listPrice is 0 or negative (never blocks). */
  manualDiscountPercent: number;
  /** Human-readable reason when not allowed; null when allowed. */
  reason: string | null;
}

export function checkDiscountAuthorization(input: DiscountAuthorizationInput): DiscountAuthorizationResult {
  const listPrice = Number.isFinite(input.listPrice) && input.listPrice > 0 ? input.listPrice : 0;
  const manualDiscountAmount = Number.isFinite(input.manualDiscountAmount) && input.manualDiscountAmount > 0
    ? input.manualDiscountAmount
    : 0;

  // A zero/negative list price can never produce a meaningful percentage —
  // treat it as no discretionary discount rather than dividing by zero or
  // blocking a free/comp sale.
  const manualDiscountPercent = listPrice > 0 ? (manualDiscountAmount / listPrice) * 100 : 0;

  if (manualDiscountPercent <= DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT) {
    return { allowed: true, manualDiscountPercent, reason: null };
  }

  const authorized = Boolean(input.performedByRole) && AUTHORIZING_ROLES.has(input.performedByRole as string);
  return {
    allowed: authorized,
    manualDiscountPercent,
    reason: authorized
      ? null
      : `This discount is ${manualDiscountPercent.toFixed(2)}% off list price — above the ${DISCRETIONARY_DISCOUNT_THRESHOLD_PERCENT}% limit. An owner, admin, or manager needs to complete this sale.`,
  };
}
