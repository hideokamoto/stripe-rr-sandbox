import Stripe from "stripe";
import { env } from "./env.server";

let _stripe: Stripe | null = null;

/** Lazily-constructed singleton Stripe client (server-only). */
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.stripeSecretKey, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}
