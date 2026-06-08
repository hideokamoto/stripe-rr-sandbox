/**
 * Centralised, typed access to server-side environment variables.
 * Throws early (at first use) if a required variable is missing so that
 * misconfiguration surfaces clearly instead of as a cryptic Stripe/Clerk error.
 */
/** Read an env var, throwing a clear error if it is unset. */
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
  /**
   * Public base URL used for Checkout return_url and invitation redirects.
   * Falls back to localhost only in development; in any other environment
   * APP_URL is required so production never generates localhost links.
   */
  get appUrl() {
    if (process.env.APP_URL) return process.env.APP_URL;
    if (process.env.NODE_ENV === "development") return "http://localhost:5173";
    throw new Error("Missing required environment variable: APP_URL");
  },
  priceMonthly: process.env.STRIPE_PRICE_MONTHLY,
  priceYearly: process.env.STRIPE_PRICE_YEARLY,
};
