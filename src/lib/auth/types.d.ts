import type { Permission } from "@/generated/prisma/client";
import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string | null;
      isPlatformAdmin: boolean;
      tokenVersion: number;
      permissions: Record<string, Permission[]>;
      systemRoles: string[];
      clientId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId?: string | null;
    isPlatformAdmin?: boolean;
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string | null;
    isPlatformAdmin?: boolean;
    tokenVersion?: number;
    permissions?: Record<string, Permission[]>;
    systemRoles?: string[];
    clientId?: string | null;
  }
}
