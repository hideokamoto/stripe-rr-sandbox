import { createContext } from "react-router";

export interface User {
  id: string;
  name: string;
}

/**
 * Router context used to share the authenticated user between the auth
 * middleware and the route's loader/action.
 */
export const userContext = createContext<User | null>(null);

/**
 * Resolve the current user from the request.
 *
 * This is a stand-in for a real session store: it reads a `session` cookie and
 * treats its value as the user id. Swap this out for your real session/JWT
 * verification logic.
 */
export function getUserFromRequest(request: Request): User | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) return null;
  return { id: match[1], name: "Demo User" };
}
