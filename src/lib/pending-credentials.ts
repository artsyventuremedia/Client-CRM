import { prisma } from "@/lib/prisma";

const EXPIRY_DAYS = 7;

export async function recordPendingCredential(params: {
  organizationId: string;
  userId: string;
  email: string;
  tempPassword: string;
  role: string;
  createdById: string;
}) {
  await prisma.pendingCredential.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      email: params.email,
      tempPassword: params.tempPassword,
      role: params.role,
      createdById: params.createdById,
      expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });
}
