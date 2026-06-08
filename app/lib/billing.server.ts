import type Stripe from "stripe";
import { getStripe } from "./stripe.server";
import { getClerk } from "./clerk.server";
import { findPlanByPriceId } from "./plans";

/**
 * The unified subscription shape persisted to Clerk publicMetadata.
 * Both signup flows converge to exactly this structure, so the rest of the app
 * (dashboard, route guards) only ever reads from here.
 */
export interface SubscriptionMetadata {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: string | null;
  subscriptionStatus: Stripe.Subscription.Status | "none";
  currentPeriodEnd: number | null;
}

/** Read the unified subscription state off a Clerk user's publicMetadata. */
export function readSubscription(
  publicMetadata: Record<string, unknown> | undefined | null,
): SubscriptionMetadata | null {
  if (!publicMetadata || !publicMetadata.stripeCustomerId) return null;
  return {
    stripeCustomerId: String(publicMetadata.stripeCustomerId),
    stripeSubscriptionId:
      (publicMetadata.stripeSubscriptionId as string | null) ?? null,
    plan: (publicMetadata.plan as string | null) ?? null,
    subscriptionStatus:
      (publicMetadata.subscriptionStatus as SubscriptionMetadata["subscriptionStatus"]) ??
      "none",
    currentPeriodEnd: (publicMetadata.currentPeriodEnd as number | null) ?? null,
  };
}

export function isActive(sub: SubscriptionMetadata | null): boolean {
  return (
    sub?.subscriptionStatus === "active" ||
    sub?.subscriptionStatus === "trialing"
  );
}

/** Pick the most relevant subscription: prefer active/trialing, else newest. */
function pickSubscription(
  subs: Stripe.Subscription[],
): Stripe.Subscription | undefined {
  if (subs.length === 0) return undefined;
  const live = subs.find(
    (s) => s.status === "active" || s.status === "trialing",
  );
  if (live) return live;
  return [...subs].sort((a, b) => b.created - a.created)[0];
}

/**
 * Resolve the Stripe customer for a Clerk user: first via the stored
 * publicMetadata.stripeCustomerId (set in Flow B's invitation or a prior sync),
 * otherwise by matching the user's primary email address.
 */
async function resolveCustomerId(
  stripe: Stripe,
  user: { publicMetadata: Record<string, unknown>; email: string | null },
): Promise<string | null> {
  const stored = user.publicMetadata?.stripeCustomerId;
  if (stored) return String(stored);
  if (!user.email) return null;
  const matches = await stripe.customers.list({ email: user.email, limit: 1 });
  return matches.data[0]?.id ?? null;
}

/**
 * THE convergence point. Pulls the live subscription state from Stripe and
 * mirrors it into Clerk publicMetadata, and backfills the
 * customer.metadata.clerkUserId link. Called from:
 *   - the Stripe webhook (Flow A completion, subscription.updated/deleted)
 *   - the dashboard loader (self-heal, completes the link for Flow B users)
 *
 * Idempotent: safe to call repeatedly.
 */
export async function syncSubscriptionToClerk(
  clerkUserId: string,
): Promise<SubscriptionMetadata | null> {
  const stripe = getStripe();
  const clerk = getClerk();

  const user = await clerk.users.getUser(clerkUserId);
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;

  const customerId = await resolveCustomerId(stripe, {
    publicMetadata: user.publicMetadata as Record<string, unknown>,
    email,
  });
  if (!customerId) return null;

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  const sub = pickSubscription(subs.data);
  const item = sub?.items.data[0];
  const priceId = item?.price.id;

  const metadata: SubscriptionMetadata = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub?.id ?? null,
    plan: findPlanByPriceId(priceId)?.key ?? null,
    subscriptionStatus: sub?.status ?? "none",
    // current_period_end lives on the subscription item in recent API versions,
    // with a fallback to the subscription for older shapes.
    currentPeriodEnd:
      (item as { current_period_end?: number } | undefined)
        ?.current_period_end ??
      (sub as unknown as { current_period_end?: number } | undefined)
        ?.current_period_end ??
      null,
  };

  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: metadata as unknown as Record<string, unknown>,
  });

  // Backfill the reverse link so subscription.* webhooks can find this user.
  await stripe.customers.update(customerId, { metadata: { clerkUserId } });

  return metadata;
}

/**
 * Find the Clerk userId linked to a Stripe customer (set by
 * syncSubscriptionToClerk). Used by subscription.* webhook events.
 */
export async function clerkUserIdForCustomer(
  customerId: string,
): Promise<string | null> {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return (customer.metadata?.clerkUserId as string | undefined) ?? null;
}
