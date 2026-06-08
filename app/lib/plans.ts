/**
 * Subscription plans, derived from Stripe Price IDs in the environment.
 * `plan` keys are stored verbatim in Clerk publicMetadata so the dashboard
 * can render a friendly name regardless of which signup flow was used.
 *
 * This module is safe to import on both server and client: the Price IDs are
 * also exposed through VITE_-prefixed vars are NOT used here — instead the
 * client receives the plan list via loader data, keeping secrets server-side.
 */
export type PlanInterval = "month" | "year";

export interface Plan {
  /** Stable key persisted to Clerk publicMetadata.plan */
  key: string;
  name: string;
  priceId: string;
  interval: PlanInterval;
}

/**
 * Build the active plan list from env Price IDs. Unset prices are skipped so a
 * demo can run with just STRIPE_PRICE_MONTHLY.
 */
export function getPlans(): Plan[] {
  const plans: Plan[] = [];
  if (process.env.STRIPE_PRICE_MONTHLY) {
    plans.push({
      key: "monthly",
      name: "Monthly",
      priceId: process.env.STRIPE_PRICE_MONTHLY,
      interval: "month",
    });
  }
  if (process.env.STRIPE_PRICE_YEARLY) {
    plans.push({
      key: "yearly",
      name: "Yearly",
      priceId: process.env.STRIPE_PRICE_YEARLY,
      interval: "year",
    });
  }
  return plans;
}

/** Find a plan by its Stripe Price ID (used when syncing from a subscription). */
export function findPlanByPriceId(priceId: string | undefined): Plan | undefined {
  if (!priceId) return undefined;
  return getPlans().find((p) => p.priceId === priceId);
}

/** Resolve a plan from its stored key, falling back to the first plan. */
export function findPlanByKey(key: string | undefined): Plan | undefined {
  const plans = getPlans();
  return plans.find((p) => p.key === key) ?? plans[0];
}
