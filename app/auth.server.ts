import type { User } from "~/context";

/**
 * Stand-in user lookup. A real app would query a database here; for the sandbox
 * we treat the session `userId` (an email) as the identity and synthesize a
 * profile from it.
 */
export async function getUserById(userId: string): Promise<User | null> {
  if (!userId) return null;
  return {
    id: userId,
    email: userId,
    name: userId.split("@")[0] || userId,
  };
}
