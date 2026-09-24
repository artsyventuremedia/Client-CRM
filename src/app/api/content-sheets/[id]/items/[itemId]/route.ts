import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";
import { updateContentSheetItemSchema } from "@/lib/validation/content-sheet";
import { recordAudit } from "@/lib/audit";

async function loadScopedItem(organizationId: string, clientId: string | null | undefined, contentSheetId: string, itemId: string) {
  const item = await prisma.contentSheetItem.findFirst({
    where: { id: itemId, contentSheetId, contentSheet: { organizationId } },
    include: { contentSheet: { select: { clientId: true } } },
  });
  if (!item) throw new ApiError(404, "Content sheet item not found");
  if (clientId && clientId !== item.contentSheet.clientId) {
    throw new ApiError(403, "You can only access your own account's data");
  }
  return item;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { id: contentSheetId, itemId } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "content_sheets", "EDIT");

    const existing = await loadScopedItem(organizationId, session.user.clientId, contentSheetId, itemId);

    const body = await request.json().catch(() => null);
    const parsed = updateContentSheetItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const item = await prisma.contentSheetItem.update({ where: { id: itemId }, data: parsed.data });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "content_sheet_item.updated",
      entityType: "ContentSheetItem",
      entityId: item.id,
      previousValue: existing,
      newValue: item,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { id: contentSheetId, itemId } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "content_sheets", "DELETE");

    const existing = await loadScopedItem(organizationId, session.user.clientId, contentSheetId, itemId);

    await prisma.contentSheetItem.delete({ where: { id: itemId } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "content_sheet_item.deleted",
      entityType: "ContentSheetItem",
      entityId: itemId,
      previousValue: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
