import { getAuth } from "@clerk/react-router/server";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/dashboard";
import { Shell } from "~/components/layout";
import { syncSubscriptionToClerk, isActive } from "~/lib/billing.server";
import { findPlanByKey } from "~/lib/plans";

/** Page metadata for the dashboard. */
export function meta(_: Route.MetaArgs) {
  return [{ title: "Dashboard — SaaSKit" }];
}

/** Require auth and self-heal subscription state from Stripe into Clerk. */
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect("/sign-in");

  // Self-heal: pull the latest state from Stripe into Clerk publicMetadata.
  // For Flow B users signing in for the first time, this completes the link
  // (customer.metadata.clerkUserId) and fills in the unified subscription shape.
  // Best-effort: a transient sync error should not 500 the dashboard.
  let subscription: Awaited<ReturnType<typeof syncSubscriptionToClerk>> = null;
  try {
    subscription = await syncSubscriptionToClerk(userId);
  } catch (error) {
    console.error("Dashboard subscription sync failed", { userId, error });
  }
  const plan = findPlanByKey(subscription?.plan ?? undefined);

  return {
    subscription,
    active: isActive(subscription),
    planName: plan?.name ?? subscription?.plan ?? null,
  };
}

/** Shared end-state for both flows: shows unified subscription status. */
export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { subscription, active, planName } = loaderData;

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <div className="mt-6 rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Subscription</h2>
            <span
              className={
                active
                  ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }
            >
              {subscription?.subscriptionStatus ?? "none"}
            </span>
          </div>

          {active ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Plan</dt>
                <dd className="font-medium">{planName ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Renews</dt>
                <dd className="font-medium">
                  {subscription?.currentPeriodEnd
                    ? new Date(
                        subscription.currentPeriodEnd * 1000,
                      ).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer</dt>
                <dd className="font-mono text-xs">
                  {subscription?.stripeCustomerId}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You don't have an active subscription yet.
              </p>
              <Link
                to="/subscribe"
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Subscribe now
              </Link>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
