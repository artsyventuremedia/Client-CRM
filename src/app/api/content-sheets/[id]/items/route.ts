import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";
import { createContentSheetItemSchema } from "@/lib/validation/content-sheet";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contentSheetId } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "content_sheets", "CREATE");

    const sheet = await prisma.contentSheet.findFirst({ where: { id: contentSheetId, organizationId } });
    if (!sheet) return NextResponse.json({ error: "Content sheet not found" }, { status: 404 });
    if (session.user.clientId && session.user.clientId !== sheet.clientId) {
      throw new ApiError(403, "You can only access your own account's data");
    }

    const body = await request.json().catch(() => null);
    const parsed = createContentSheetItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const item = await prisma.contentSheetItem.create({
      data: {
        contentSheetId,
        createdById: session.user.id,
        ...parsed.data,
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "content_sheet_item.created",
      entityType: "ContentSheetItem",
      entityId: item.id,
      newValue: item,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
