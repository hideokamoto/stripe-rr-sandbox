import {
  type RouteConfig,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("pricing", "routes/pricing.tsx"),

  // Flow A: Clerk account first
  route("sign-in/*", "routes/sign-in.tsx"),
  route("sign-up/*", "routes/sign-up.tsx"),
  route("subscribe", "routes/subscribe.tsx"),

  // Flow B: Stripe checkout first
  route("join", "routes/join.tsx"),

  // Shared
  route("checkout/return", "routes/checkout.return.tsx"),
  route("dashboard", "routes/dashboard.tsx"),

  // Resource routes (no UI)
  route("api/checkout/authenticated", "routes/api.checkout.authenticated.tsx"),
  route("api/checkout/guest", "routes/api.checkout.guest.tsx"),
  route("api/webhooks/stripe", "routes/api.webhooks.stripe.tsx"),
] satisfies RouteConfig;
