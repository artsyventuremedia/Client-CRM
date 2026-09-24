import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";
import { updateKickoffSchema } from "@/lib/validation/kickoff";
import { recordAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "kickoff_documents", "VIEW");

    const document = await prisma.kickoffDocument.findFirst({
      where: { id, organizationId },
      include: { client: { select: { id: true, name: true, companyName: true } }, createdBy: { select: { name: true } } },
    });
    if (!document) return NextResponse.json({ error: "Kickoff document not found" }, { status: 404 });
    if (session.user.clientId && (session.user.clientId !== document.clientId || !document.sharedAt)) {
      throw new ApiError(403, "This document has not been shared with you");
    }

    return NextResponse.json({ document });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "kickoff_documents", "EDIT");

    const existing = await prisma.kickoffDocument.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Kickoff document not found" }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = updateKickoffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { share, ...fields } = parsed.data;

    const document = await prisma.kickoffDocument.update({
      where: { id },
      data: {
        ...fields,
        ...(share === true ? { sharedAt: new Date() } : {}),
        ...(share === false ? { sharedAt: null } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "kickoff_document.updated",
      entityType: "KickoffDocument",
      entityId: document.id,
      previousValue: existing,
      newValue: document,
    });

    return NextResponse.json({ document });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "kickoff_documents", "DELETE");

    const existing = await prisma.kickoffDocument.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Kickoff document not found" }, { status: 404 });

    await prisma.kickoffDocument.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "kickoff_document.deleted",
      entityType: "KickoffDocument",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
