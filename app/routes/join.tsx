import type { Route } from "./+types/join";
import { Shell } from "~/components/layout";
import { CheckoutEmbed } from "~/components/embedded-checkout";
import { env } from "~/lib/env.server";
import { getPlans } from "~/lib/plans";

/** Page metadata for the guest subscribe page. */
export function meta(_: Route.MetaArgs) {
  return [{ title: "Subscribe — SaaSKit" }];
}

/** Resolve the selected plan and expose the publishable key to the client. */
export async function loader(args: Route.LoaderArgs) {
  const url = new URL(args.request.url);
  const requestedPlan = url.searchParams.get("plan");
  const plans = getPlans();
  const selected = plans.find((p) => p.key === requestedPlan) ?? plans[0];

  return {
    publishableKey: env.stripePublishableKey,
    priceId: selected?.priceId ?? null,
  };
}

/** Flow B checkout: public embedded Stripe Checkout for anonymous visitors. */
export default function Join({ loaderData }: Route.ComponentProps) {
  const { publishableKey, priceId } = loaderData;

  return (
    <Shell>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-2xl font-bold">Subscribe to get started</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          After payment we'll email an invitation to finish creating your
          account.
        </p>
        {priceId ? (
          <CheckoutEmbed
            publishableKey={publishableKey}
            endpoint="/api/checkout/guest"
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
