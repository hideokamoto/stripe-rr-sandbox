import { Link } from "react-router";
import { Show, UserButton } from "@clerk/react-router";

/** Shared page chrome: top nav + centered content container. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            SaaS<span className="text-indigo-600">Kit</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/pricing" className="hover:underline">
              Pricing
            </Link>
            <Show when="signed-in">
              <Link to="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <UserButton />
            </Show>
            <Show when="signed-out">
              <Link to="/sign-in" className="hover:underline">
                Sign in
              </Link>
            </Show>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
