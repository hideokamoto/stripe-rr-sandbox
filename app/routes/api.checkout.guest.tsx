import type { Route } from "./+types/api.checkout.guest";
import { createEmbeddedSubscriptionSession, resolvePriceId } from "~/lib/checkout.server";

/**
 * Flow B: an anonymous visitor starts an embedded subscription checkout.
 * No Clerk user exists yet — Stripe collects the email and creates the
 * customer; the Clerk account is provisioned later by the webhook.
 */
export async function action(args: Route.ActionArgs) {
  const body = await args.request.json().catch(() => ({}));
  const priceId = resolvePriceId(body?.priceId ?? null);

  const session = await createEmbeddedSubscriptionSession({ priceId });

  return { clientSecret: session.client_secret };
}
