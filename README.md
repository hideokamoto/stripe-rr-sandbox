# Clerk + Stripe SaaS starter (React Router 7)

A minimal SaaS template demonstrating **two account-creation flows** that converge
on the **same data structure and experience**:

- **Flow A — Account first**: sign up with Clerk, then subscribe via an embedded
  Stripe Checkout Session.
- **Flow B — Subscribe first**: pay through an embedded Stripe Checkout Session as
  a guest; the system then provisions a Clerk user by emailing an invitation.

Either way you end up with a Clerk user whose `publicMetadata` holds the
subscription state, and a Stripe customer linked back via
`metadata.clerkUserId`.

## How the two flows converge

```
/pricing (2 CTAs)
 ├─ Flow A: /sign-up → /subscribe → POST /api/checkout/authenticated
 │            (client_reference_id = clerkUserId)
 └─ Flow B: /join → POST /api/checkout/guest (collects email, no Clerk user)
                       │
        both → Stripe embedded Checkout → /checkout/return
                       │ (Stripe webhook)
        POST /api/webhooks/stripe : checkout.session.completed
          ├─ client_reference_id present (A) → syncSubscriptionToClerk(userId)
          └─ absent (B) → invitations.createInvitation(email, {stripeCustomerId})
 → /dashboard : loader calls syncSubscriptionToClerk(userId) to self-heal
```

The single convergence point is **`syncSubscriptionToClerk()`**
(`app/lib/billing.server.ts`): it pulls the live subscription from Stripe, mirrors
it into Clerk `publicMetadata`, and backfills the `customer.metadata.clerkUserId`
link. It is called from both the Stripe webhook and the dashboard loader, so both
flows reach an identical end-state. No local database and no Clerk webhook are
required.

### Unified `publicMetadata` shape

```ts
{
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: string | null;            // plan key, e.g. "monthly"
  subscriptionStatus: string;     // Stripe subscription status, or "none"
  currentPeriodEnd: number | null;// unix seconds
}
```

## Key files

| Path | Purpose |
|------|---------|
| `app/root.tsx` | `ClerkProvider` + `clerkMiddleware` + `rootAuthLoader` |
| `app/lib/billing.server.ts` | `syncSubscriptionToClerk()` — the convergence point |
| `app/lib/checkout.server.ts` | Creates embedded subscription Checkout Sessions |
| `app/routes/api.checkout.authenticated.tsx` | Flow A session (logged-in user) |
| `app/routes/api.checkout.guest.tsx` | Flow B session (anonymous) |
| `app/routes/api.webhooks.stripe.tsx` | Webhook; provisions Flow B users |
| `app/routes/dashboard.tsx` | Shared end-state, self-heals via sync |

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   - **Clerk**: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` from the
     [Clerk dashboard](https://dashboard.clerk.com).
   - **Stripe** (test mode): `STRIPE_SECRET_KEY` (a restricted key `rk_` is
     recommended), `STRIPE_PUBLISHABLE_KEY`, and at least one recurring Price ID
     (`STRIPE_PRICE_MONTHLY`, optionally `STRIPE_PRICE_YEARLY`). Create the
     product/prices in the Stripe Dashboard.

3. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:5173`.

4. Forward Stripe webhooks locally and set the resulting signing secret as
   `STRIPE_WEBHOOK_SECRET`:

   ```bash
   stripe listen --forward-to localhost:5173/api/webhooks/stripe
   ```

## Testing the flows

Use Stripe test card `4242 4242 4242 4242`, any future expiry and CVC.

- **Flow A**: `/pricing` → "Sign up & subscribe" → create a Clerk account →
  `/subscribe` → pay → `/checkout/return` → `/dashboard` shows the active
  subscription.
- **Flow B**: `/pricing` → "Subscribe & create account" → pay with a new email →
  `/checkout/return` asks you to check your inbox → accept the Clerk invitation →
  sign up → `/dashboard` shows the **same** subscription shape.

Verify in the Clerk and Stripe dashboards that the user's `publicMetadata` and the
customer's `metadata.clerkUserId` are populated identically for both flows.

## Building for production

```bash
npm run build
npm run start
```

## Notes

- `payment_method_types` is intentionally never passed to Stripe so dynamic
  payment methods (configured in the Dashboard) are used.
- Secrets live only in server-only `*.server.ts` modules and are never shipped to
  the client.

---

Built with React Router 7, Clerk, and Stripe.
