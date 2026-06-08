import type Stripe from "stripe";
import { getStripe } from "./stripe.server";
import { env } from "./env.server";
import { getPlans } from "./plans";

/** Validate a Price ID against the configured plans; fall back to the first. */
export function resolvePriceId(requested: string | null): string {
  const plans = getPlans();
  if (plans.length === 0) {
    throw new Error(
      "No subscription plans configured. Set STRIPE_PRICE_MONTHLY (and optionally STRIPE_PRICE_YEARLY).",
    );
  }
  const match = plans.find((p) => p.priceId === requested);
  return match?.priceId ?? plans[0].priceId;
}

const RETURN_URL = `${env.appUrl}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

/**
 * Create an embedded subscription Checkout Session.
 *
 * - Flow A passes `clerkUserId` (+ an existing/created `customer`) so the
 *   webhook can immediately link the session to the Clerk user.
 * - Flow B passes neither; Stripe creates the customer and we provision the
 *   Clerk user later from the collected email.
 *
 * Note: `payment_method_types` is intentionally omitted so Stripe serves
 * dynamic payment methods configured in the Dashboard.
 */
export async function createEmbeddedSubscriptionSession(opts: {
  priceId: string;
  clerkUserId?: string;
  customerId?: string;
  customerEmail?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    ui_mode: "embedded_page",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    return_url: RETURN_URL,
  };

  if (opts.clerkUserId) {
    params.client_reference_id = opts.clerkUserId;
    params.subscription_data = { metadata: { clerkUserId: opts.clerkUserId } };
  }

  if (opts.customerId) {
    params.customer = opts.customerId;
  } else {
    // Guest flow (or first-time): let Stripe persist a customer and collect email.
    params.customer_creation = "always";
    if (opts.customerEmail) params.customer_email = opts.customerEmail;
  }

  return stripe.checkout.sessions.create(params);
}
