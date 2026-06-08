import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import {
  rootAuthLoader,
  clerkMiddleware,
} from "@clerk/react-router/server";
import { ClerkProvider } from "@clerk/react-router";

import type { Route } from "./+types/root";
import "./app.css";

/** Attach Clerk auth to the request context on every route. */
export const middleware: Route.MiddlewareFunction[] = [clerkMiddleware()];

/** Root loader: inject Clerk auth state so it's available client-side. */
export async function loader(args: Route.LoaderArgs) {
  return rootAuthLoader(args);
}

/** Document `<link>` tags (fonts) for every page. */
export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

/** HTML document shell shared by every route and the error boundary. */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/** App root: wrap all routes in Clerk's provider using root loader data. */
export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ClerkProvider loaderData={loaderData} signInFallbackRedirectUrl="/dashboard">
      <Outlet />
    </ClerkProvider>
  );
}

/** Top-level error boundary rendering 404s and unexpected errors. */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
