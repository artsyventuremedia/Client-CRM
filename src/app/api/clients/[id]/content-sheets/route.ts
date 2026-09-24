import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";
import { requireClientAccess } from "@/lib/api/client-access";
import { createContentSheetSchema } from "@/lib/validation/content-sheet";
import { recordAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "content_sheets", "VIEW");
    await requireClientAccess(session, organizationId, clientId);

    const sheets = await prisma.contentSheet.findMany({
      where: { clientId, organizationId },
      include: { _count: { select: { items: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json({ sheets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "content_sheets", "CREATE");
    if (session.user.clientId) throw new ApiError(403, "Only your account team can create a new monthly content sheet");
    await requireClientAccess(session, organizationId, clientId);

    const body = await request.json().catch(() => null);
    const parsed = createContentSheetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.contentSheet.findUnique({
      where: { clientId_month_year: { clientId, month: parsed.data.month, year: parsed.data.year } },
    });
    if (existing) {
      return NextResponse.json({ error: "A content sheet for this month already exists" }, { status: 409 });
    }

    const sheet = await prisma.contentSheet.create({
      data: {
        organizationId,
        clientId,
        createdById: session.user.id,
        month: parsed.data.month,
        year: parsed.data.year,
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "content_sheet.created",
      entityType: "ContentSheet",
      entityId: sheet.id,
      newValue: sheet,
    });

    return NextResponse.json({ sheet }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
