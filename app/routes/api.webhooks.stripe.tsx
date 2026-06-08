import type Stripe from "stripe";
import type { Route } from "./+types/api.webhooks.stripe";
import { getStripe } from "~/lib/stripe.server";
import { getClerk } from "~/lib/clerk.server";
import { env } from "~/lib/env.server";
import {
  syncSubscriptionToClerk,
  clerkUserIdForCustomer,
} from "~/lib/billing.server";

/**
 * Stripe webhook — the single point where both signup flows converge.
 *
 *   checkout.session.completed
 *     ├─ client_reference_id present (Flow A): the Clerk user already exists,
 *     │  so mirror the subscription straight into their publicMetadata.
 *     └─ absent (Flow B): no Clerk user yet — send a Clerk invitation carrying
 *        the stripeCustomerId. On first dashboard load the sync completes the
 *        unified state (same shape as Flow A).
 *
 *   customer.subscription.updated / deleted
 *     └─ resolve the linked Clerk user via customer.metadata.clerkUserId and
 *        re-sync so the dashboard tracks status changes.
 */
export async function action(args: Route.ActionArgs) {
  const stripe = getStripe();
  const payload = await args.request.text();
  const signature = args.request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      env.stripeWebhookSecret,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const clerkUserId = session.client_reference_id;

        if (clerkUserId) {
          // Flow A — Clerk user already exists.
          await syncSubscriptionToClerk(clerkUserId);
        } else {
          // Flow B — provision a Clerk user via invitation.
          await provisionFromGuestCheckout(session);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const userId = await clerkUserIdForCustomer(customerId);
        if (userId) await syncSubscriptionToClerk(userId);
        break;
      }

      default:
        // Unhandled event types are acknowledged without action.
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}

/**
 * Flow B provisioning: invite the email collected at checkout. The invitation
 * carries stripeCustomerId so it survives into the new user's publicMetadata;
 * the dashboard loader's sync then fills in the full unified shape.
 */
async function provisionFromGuestCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const email = session.customer_details?.email ?? session.customer_email;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!email || !customerId) {
    console.warn(
      "Guest checkout completed without email/customer; skipping provisioning.",
    );
    return;
  }

  const clerk = getClerk();

  // If a Clerk user with this email already exists, link directly instead of
  // sending a duplicate invitation (keeps the flow idempotent).
  const existing = await clerk.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  if (existing.data.length > 0) {
    await syncSubscriptionToClerk(existing.data[0].id);
    return;
  }

  await clerk.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: { stripeCustomerId: customerId },
    redirectUrl: `${env.appUrl}/sign-up`,
    ignoreExisting: true,
  });
}
