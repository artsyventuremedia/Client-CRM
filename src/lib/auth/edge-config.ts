import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config used only by middleware to check for a valid session
 * cookie. Must not import Prisma or bcrypt - those pull in Node APIs that
 * don't run in the Edge runtime and caused conflicting DB connections when
 * previously imported here.
 */
export const edgeAuthConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
};
