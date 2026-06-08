import { createClerkClient } from "@clerk/react-router/api.server";
import { env } from "./env.server";

let _clerk: ReturnType<typeof createClerkClient> | null = null;

/** Lazily-constructed singleton Clerk Backend API client (server-only). */
export function getClerk() {
  if (!_clerk) {
    _clerk = createClerkClient({ secretKey: env.clerkSecretKey });
  }
  return _clerk;
}
