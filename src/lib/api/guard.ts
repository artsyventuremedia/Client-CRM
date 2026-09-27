import { NextResponse } from "next/server";
import { getActiveSession } from "@/lib/auth/active-session";
import { can } from "@/lib/rbac/check";
import type { Resource } from "@/lib/rbac/matrix";
import type { Permission } from "@/generated/prisma/client";
import type { Session } from "next-auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getActiveSession();
  if (!session?.user) {
    throw new ApiError(401, "Authentication required");
  }
  return session;
}

/** Returns the session and the caller's organizationId, rejecting platform-admin-only sessions with no tenant. */
export async function requireOrgSession(): Promise<{ session: Session; organizationId: string }> {
  const session = await requireSession();
  if (!session.user.organizationId) {
    throw new ApiError(403, "This action requires an organization context");
  }
  return { session, organizationId: session.user.organizationId };
}

export function requirePermission(session: Session, resource: Resource, permission: Permission) {
  if (session.user.isPlatformAdmin) return;
  if (!can(session.user.permissions, resource, permission)) {
    throw new ApiError(403, `Missing permission ${resource}:${permission}`);
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
