import { Link, redirect } from "react-router";
import type { Route } from "./+types/checkout.return";
import { Shell } from "~/components/layout";
import { getStripe } from "~/lib/stripe.server";

export async function loader(args: Route.LoaderArgs) {
  const url = new URL(args.request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) throw redirect("/pricing");

  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  // Flow A sessions carry the Clerk userId; Flow B sessions do not.
  const isFlowA = Boolean(session.client_reference_id);

  return {
    status: session.status, // 'complete' | 'open' | 'expired'
    isFlowA,
    email: session.customer_details?.email ?? null,
  };
}

export default function CheckoutReturn({ loaderData }: Route.ComponentProps) {
  const { status, isFlowA, email } = loaderData;

  if (status !== "complete") {
    return (
      <Shell>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-2xl font-bold">Payment not completed</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Your checkout session is {status}. You can try again from pricing.
          </p>
          <Link
            to="/pricing"
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
          >
            Back to pricing
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-bold">🎉 Subscription active</h1>
        {isFlowA ? (
          <>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Thanks for subscribing! Your account is ready.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
            >
              Go to dashboard
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              We've sent an invitation{email ? ` to ${email}` : ""} to finish
              setting up your account. Check your inbox and follow the link to
              choose a password, then sign in.
            </p>
            <Link
              to="/sign-in"
              className="mt-6 inline-block rounded-lg border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
            >
              Go to sign in
            </Link>
          </>
        )}
      </div>
    </Shell>
  );
}
