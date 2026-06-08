import { getAuth } from "@clerk/react-router/server";
import { redirect } from "react-router";
import type { Route } from "./+types/subscribe";
import { Shell } from "~/components/layout";
import { CheckoutEmbed } from "~/components/embedded-checkout";
import { env } from "~/lib/env.server";
import { getPlans } from "~/lib/plans";
import { syncSubscriptionToClerk, isActive } from "~/lib/billing.server";

/** Guard the page: require auth, skip to dashboard if already subscribed. */
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect("/sign-in");

  // If the user already has an active subscription, skip checkout. Treat the
  // sync as best-effort so a transient Stripe/Clerk error never blocks checkout.
  let current: Awaited<ReturnType<typeof syncSubscriptionToClerk>> = null;
  try {
    current = await syncSubscriptionToClerk(userId);
  } catch (error) {
    console.error("Pre-checkout subscription sync failed", { userId, error });
  }
  if (isActive(current)) throw redirect("/dashboard");

  const url = new URL(args.request.url);
  const requestedPlan = url.searchParams.get("plan");
  const plans = getPlans();
  const selected = plans.find((p) => p.key === requestedPlan) ?? plans[0];

  return {
    publishableKey: env.stripePublishableKey,
    priceId: selected?.priceId ?? null,
  };
}

/** Flow A checkout: embedded Stripe Checkout for the authenticated user. */
export default function Subscribe({ loaderData }: Route.ComponentProps) {
  const { publishableKey, priceId } = loaderData;

  return (
    <Shell>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-bold">Complete your subscription</h1>
        {priceId ? (
          <CheckoutEmbed
            publishableKey={publishableKey}
            endpoint="/api/checkout/authenticated"
            priceId={priceId}
          />
        ) : (
          <p className="text-sm text-amber-700">
            No plan configured. Set STRIPE_PRICE_MONTHLY in your environment.
          </p>
        )}
      </div>
    </Shell>
  );
}
