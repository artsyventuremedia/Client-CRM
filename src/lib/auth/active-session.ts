import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

/**
 * Returns the session only if it is still valid against the database:
 * the account is ACTIVE, not currently locked out, and its tokenVersion
 * still matches the token's - a mismatch means the user (or an admin)
 * revoked all sessions since this JWT was issued (see /api/auth/sign-out-all).
 *
 * The JWT itself is stateless and can otherwise remain valid for up to
 * 30 days, so this check is what makes "sign out of all devices" and
 * account suspension actually take effect immediately server-side,
 * instead of only on next natural token refresh.
 */
export async function getActiveSession(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, tokenVersion: true, lockedUntil: true },
  });

  if (!user) return null;
  if (user.status !== "ACTIVE") return null;
  if (user.lockedUntil && user.lockedUntil > new Date()) return null;
  if (user.tokenVersion !== session.user.tokenVersion) return null;

  return session;
}
