import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/guard";
import type { Session } from "next-auth";

/**
 * Resolves whether the caller may act on the given client's data and returns
 * the client row. A client-portal login (session.user.clientId set) may only
 * ever touch its own client record, regardless of organizationId scoping.
 */
export async function requireClientAccess(session: Session, organizationId: string, clientId: string) {
  if (session.user.clientId && session.user.clientId !== clientId) {
    throw new ApiError(403, "You can only access your own account's data");
  }
  const client = await prisma.client.findFirst({ where: { id: clientId, organizationId } });
  if (!client) throw new ApiError(404, "Client not found");
  return client;
}
