import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Permission } from "@/generated/prisma";
import type { SessionPermissions } from "@/lib/rbac/check";
import { edgeAuthConfig } from "./edge-config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: { email: email.toLowerCase() },
        });
        if (!user || !user.passwordHash) return null;
        if (user.status === "SUSPENDED" || user.status === "INACTIVE") return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          isPlatformAdmin: user.isPlatformAdmin,
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
        session.user.permissions = (token.permissions as Record<string, Permission[]>) ?? {};
      }
      return session;
    },
  },
};
