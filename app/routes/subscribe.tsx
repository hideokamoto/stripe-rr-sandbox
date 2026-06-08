import { getAuth } from "@clerk/react-router/server";
import { redirect } from "react-router";
import type { Route } from "./+types/subscribe";
import { Shell } from "~/components/layout";
import { CheckoutEmbed } from "~/components/embedded-checkout";
import { env } from "~/lib/env.server";
import { getPlans } from "~/lib/plans";
import { syncSubscriptionToClerk, isActive } from "~/lib/billing.server";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect("/sign-in");

  // If the user already has an active subscription, skip checkout.
  const current = await syncSubscriptionToClerk(userId);
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
