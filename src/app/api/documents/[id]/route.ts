import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, ApiError, handleApiError } from "@/lib/api/guard";
import { can } from "@/lib/rbac/check";
import { ENTITY_RESOURCE, getEntityClientId } from "@/lib/api/entity-registry";
import { readFile, deleteFile } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();

    const document = await prisma.document.findFirst({ where: { id, organizationId } });
    if (!document || !document.entityType) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const resource = ENTITY_RESOURCE[document.entityType];
    if (!resource || (!session.user.isPlatformAdmin && !can(session.user.permissions, resource, "VIEW"))) {
      throw new ApiError(403, "Missing permission to view this document");
    }
    if (session.user.clientId) {
      const clientId = await getEntityClientId(document.entityType, document.entityId!);
      if (clientId !== session.user.clientId) {
        throw new ApiError(403, "You can only access your own account's data");
      }
    }

    const buffer = await readFile(document.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.name)}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();

    const document = await prisma.document.findFirst({ where: { id, organizationId } });
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    if (document.uploadedById !== session.user.id && !session.user.isPlatformAdmin) {
      const resource = document.entityType ? ENTITY_RESOURCE[document.entityType] : undefined;
      if (!resource || !can(session.user.permissions, resource, "DELETE")) {
        throw new ApiError(403, "You can only delete files you uploaded");
      }
    }

    await prisma.document.delete({ where: { id } });
    await deleteFile(document.storageKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
