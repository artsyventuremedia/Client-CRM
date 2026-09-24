import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const organizationId = session.user.isPlatformAdmin ? searchParams.get("organizationId") : session.user.organizationId;
    if (!organizationId) throw new ApiError(400, "organizationId is required");
    if (!session.user.isPlatformAdmin) requirePermission(session, "users", "VIEW");

    // Lazily purge anything past its retention window instead of running a scheduled job.
    await prisma.pendingCredential.deleteMany({ where: { organizationId, expiresAt: { lt: new Date() } } });

    const credentials = await prisma.pendingCredential.findMany({
      where: { organizationId },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    return handleApiError(error);
  }
}
