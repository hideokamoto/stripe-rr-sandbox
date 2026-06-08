import { useCallback } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

// Cache the Stripe.js promise per publishable key across remounts.
let stripePromise: Promise<Stripe | null> | null = null;
/** Load (and memoize) Stripe.js for the given publishable key. */
function getStripeJs(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

/**
 * Renders Stripe's embedded Checkout. `endpoint` is the resource route that
 * creates the session (Flow A: /api/checkout/authenticated, Flow B:
 * /api/checkout/guest); both return `{ clientSecret }`.
 */
export function CheckoutEmbed({
  publishableKey,
  endpoint,
  priceId,
}: {
  publishableKey: string;
  endpoint: string;
  priceId?: string;
}) {
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create checkout session (${res.status})`);
    }
    const json = (await res.json()) as { clientSecret: string };
    return json.clientSecret;
  }, [endpoint, priceId]);

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider
        stripe={getStripeJs(publishableKey)}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
