import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Permission } from "@/generated/prisma";
import type { SessionPermissions } from "@/lib/rbac/check";
import { edgeAuthConfig } from "./edge-config";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

async function loadPermissions(userId: string): Promise<SessionPermissions> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: true } } },
  });

  const permissions: SessionPermissions = {};
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) {
      const existing = permissions[rp.resource] ?? [];
      if (!existing.includes(rp.permission)) existing.push(rp.permission);
      permissions[rp.resource] = existing;
    }
  }
  return permissions;
}

export const authConfig: NextAuthConfig = {
  ...edgeAuthConfig,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw, request) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        const ip = request ? clientIp(request) : "unknown";
        const userAgent = request?.headers.get("user-agent") ?? undefined;

        // Cap login attempts per source IP regardless of which account is
        // targeted, so credential-stuffing across many accounts is also slowed.
        const ipLimit = rateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000);
        if (!ipLimit.allowed) return null;

        const user = await prisma.user.findFirst({
          where: { email: normalizedEmail },
        });
        if (!user || !user.passwordHash) return null;
        if (user.status === "SUSPENDED" || user.status === "INACTIVE") return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await prisma.loginActivity.create({
            data: { userId: user.id, ipAddress: ip, userAgent, success: false },
          });
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const lockingNow = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: lockingNow ? 0 : attempts,
              lockedUntil: lockingNow ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
            },
          });
          await prisma.loginActivity.create({
            data: { userId: user.id, ipAddress: ip, userAgent, success: false },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
        });
        await prisma.loginActivity.create({
          data: { userId: user.id, ipAddress: ip, userAgent, success: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          isPlatformAdmin: user.isPlatformAdmin,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.userId = user.id;
        token.organizationId = (user as { organizationId?: string | null }).organizationId ?? null;
        token.isPlatformAdmin = (user as { isPlatformAdmin?: boolean }).isPlatformAdmin ?? false;
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
        token.permissions = await loadPermissions(user.id!);
      }
      if (trigger === "update" && token.userId) {
        token.permissions = await loadPermissions(token.userId as string);
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.organizationId = (token.organizationId as string | null) ?? null;
        session.user.isPlatformAdmin = Boolean(token.isPlatformAdmin);
        session.user.tokenVersion = Number(token.tokenVersion ?? 0);
        session.user.permissions = (token.permissions as Record<string, Permission[]>) ?? {};
      }
      return session;
    },
  },
};
