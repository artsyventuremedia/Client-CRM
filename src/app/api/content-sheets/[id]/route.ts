import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";
import { recordAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "content_sheets", "VIEW");

    const sheet = await prisma.contentSheet.findFirst({
      where: { id, organizationId },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        items: { orderBy: { date: "asc" }, include: { createdBy: { select: { name: true } } } },
      },
    });
    if (!sheet) return NextResponse.json({ error: "Content sheet not found" }, { status: 404 });
    if (session.user.clientId && session.user.clientId !== sheet.clientId) {
      throw new ApiError(403, "You can only access your own account's data");
    }

    return NextResponse.json({ sheet });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "content_sheets", "DELETE");
    if (session.user.clientId) throw new ApiError(403, "Only your account team can delete a content sheet");

    const existing = await prisma.contentSheet.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Content sheet not found" }, { status: 404 });

    await prisma.contentSheet.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "content_sheet.deleted",
      entityType: "ContentSheet",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
