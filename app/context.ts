import { createContext } from "react-router";

export type User = {
  id: string;
  email: string;
  name: string;
};

/**
 * Shared request context populated by the auth middleware so that loaders and
 * actions on protected routes can read the authenticated user without re-parsing
 * the session cookie.
 */
export const userContext = createContext<User | null>(null);
