import type { Permission } from "@/generated/prisma";
import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string | null;
      isPlatformAdmin: boolean;
      permissions: Record<string, Permission[]>;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId?: string | null;
    isPlatformAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string | null;
    isPlatformAdmin?: boolean;
    permissions?: Record<string, Permission[]>;
  }
}
