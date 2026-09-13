import { prisma } from "@/lib/prisma";

export async function recordAudit(params: {
  organizationId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousValue: params.previousValue === undefined ? undefined : JSON.parse(JSON.stringify(params.previousValue)),
      newValue: params.newValue === undefined ? undefined : JSON.parse(JSON.stringify(params.newValue)),
    },
  });
}
