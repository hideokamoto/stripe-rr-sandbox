import { Link } from "react-router";
import type { Route } from "./+types/home";
import { Shell } from "~/components/layout";

/** Page metadata for the landing page. */
export function meta(_: Route.MetaArgs) {
  return [
    { title: "SaaSKit — Clerk + Stripe starter" },
    {
      name: "description",
      content: "A minimal SaaS starter with Clerk auth and Stripe subscriptions.",
    },
  ];
}

/** Landing page introducing both signup flows. */
export default function Home() {
  return (
    <Shell>
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Clerk + Stripe SaaS starter
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Two signup flows, one unified end-state. Create your account first and
          subscribe, or subscribe first and we'll provision your account — either
          way you land in the same place.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/pricing"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
          >
            View pricing
          </Link>
          <Link
            to="/sign-in"
            className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-3xl gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <h2 className="font-semibold">Flow A — Account first</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign up with Clerk, then complete an embedded Stripe Checkout to
            start your subscription.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <h2 className="font-semibold">Flow B — Subscribe first</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Pay through embedded Stripe Checkout; we email a Clerk invitation to
            finish creating your account.
          </p>
        </div>
      </section>
    </Shell>
  );
}
