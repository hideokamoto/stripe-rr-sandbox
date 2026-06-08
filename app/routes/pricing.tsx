import { Link } from "react-router";
import type { Route } from "./+types/pricing";
import { Shell } from "~/components/layout";
import { getPlans } from "~/lib/plans";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Pricing — SaaSKit" }];
}

export async function loader(_: Route.LoaderArgs) {
  // Only expose non-secret plan info to the client.
  const plans = getPlans().map((p) => ({
    key: p.key,
    name: p.name,
    interval: p.interval,
  }));
  return { plans };
}

export default function Pricing({ loaderData }: Route.ComponentProps) {
  const { plans } = loaderData;

  return (
    <Shell>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold">Choose how to get started</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Both paths end in the same place. Pick whichever you prefer.
        </p>
      </div>

      {plans.length === 0 && (
        <p className="mx-auto mt-8 max-w-xl rounded-lg border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          No plans configured. Set <code>STRIPE_PRICE_MONTHLY</code> (and
          optionally <code>STRIPE_PRICE_YEARLY</code>) in your environment.
        </p>
      )}

      {plans.length > 0 && (
        <ul className="mx-auto mt-8 flex max-w-md flex-col gap-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {plans.map((p) => (
            <li key={p.key}>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {p.name}
              </span>{" "}
              — billed per {p.interval}
            </li>
          ))}
        </ul>
      )}

      <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Create account first</h2>
          <p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-400">
            Sign up with Clerk, then subscribe with embedded Stripe Checkout.
          </p>
          <Link
            to="/sign-up"
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
          >
            Sign up &amp; subscribe
          </Link>
        </div>

        <div className="flex flex-col rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Subscribe now</h2>
          <p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-400">
            Pay first; we'll email an invitation to set up your account.
          </p>
          <Link
            to="/join"
            className="mt-4 rounded-lg border border-indigo-600 px-4 py-2.5 text-center font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
          >
            Subscribe &amp; create account
          </Link>
        </div>
      </div>
    </Shell>
  );
}
