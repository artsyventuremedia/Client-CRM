import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";
import { updateUserStatusSchema } from "@/lib/validation/admin";
import { recordAudit } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!session.user.isPlatformAdmin) {
      if (!session.user.organizationId || target.organizationId !== session.user.organizationId) {
        throw new ApiError(403, "Cannot manage users outside your organization");
      }
      requirePermission(session, "users", "EDIT");
    }

    if (target.id === session.user.id) {
      return NextResponse.json({ error: "You cannot change your own login status" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateUserStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status: parsed.data.status, tokenVersion: { increment: 1 } },
    });

    await recordAudit({
      organizationId: target.organizationId,
      userId: session.user.id,
      action: "user.status_changed",
      entityType: "User",
      entityId: target.id,
      previousValue: { status: target.status },
      newValue: { status: updated.status },
    });

    return NextResponse.json({ user: { id: updated.id, status: updated.status } });
  } catch (error) {
    return handleApiError(error);
  }
}
