/**
 * Centralised, typed access to server-side environment variables.
 * Throws early (at first use) if a required variable is missing so that
 * misconfiguration surfaces clearly instead of as a cryptic Stripe/Clerk error.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get clerkSecretKey() {
    return required("CLERK_SECRET_KEY");
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY");
  },
  get stripePublishableKey() {
    return required("STRIPE_PUBLISHABLE_KEY");
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  get appUrl() {
    return process.env.APP_URL ?? "http://localhost:5173";
  },
  priceMonthly: process.env.STRIPE_PRICE_MONTHLY,
  priceYearly: process.env.STRIPE_PRICE_YEARLY,
};
