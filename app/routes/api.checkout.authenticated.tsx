import { getAuth } from "@clerk/react-router/server";
import { data } from "react-router";
import type { Route } from "./+types/api.checkout.authenticated";
import { getClerk } from "~/lib/clerk.server";
import { getStripe } from "~/lib/stripe.server";
import { createEmbeddedSubscriptionSession, resolvePriceId } from "~/lib/checkout.server";

/**
 * Flow A: an authenticated Clerk user starts an embedded subscription checkout.
 * Returns the Checkout Session client secret for <EmbeddedCheckout>.
 */
export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    throw data({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await args.request.json().catch(() => ({}));
  const priceId = resolvePriceId(body?.priceId ?? null);

  const clerk = getClerk();
  const stripe = getStripe();
  const user = await clerk.users.getUser(userId);
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

  // Reuse a previously-linked customer, else create one tied to this user.
  let customerId = user.publicMetadata?.stripeCustomerId as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { clerkUserId: userId },
    });
    customerId = customer.id;
  }

  const session = await createEmbeddedSubscriptionSession({
    priceId,
    clerkUserId: userId,
    customerId,
  });

  return { clientSecret: session.client_secret };
}
