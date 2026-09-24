import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { requireClientAccess } from "@/lib/api/client-access";
import { createKickoffSchema } from "@/lib/validation/kickoff";
import { recordAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "kickoff_documents", "VIEW");
    await requireClientAccess(session, organizationId, clientId);

    const documents = await prisma.kickoffDocument.findMany({
      where: {
        clientId,
        organizationId,
        // A client-portal login only ever sees documents that have been shared with them.
        ...(session.user.clientId ? { sharedAt: { not: null } } : {}),
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "kickoff_documents", "CREATE");
    await requireClientAccess(session, organizationId, clientId);

    const body = await request.json().catch(() => null);
    const parsed = createKickoffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const document = await prisma.kickoffDocument.create({
      data: {
        organizationId,
        clientId,
        createdById: session.user.id,
        ...parsed.data,
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "kickoff_document.created",
      entityType: "KickoffDocument",
      entityId: document.id,
      newValue: document,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
