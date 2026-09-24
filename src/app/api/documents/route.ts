import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, ApiError, handleApiError } from "@/lib/api/guard";
import { can } from "@/lib/rbac/check";
import { ENTITY_RESOURCE, ENTITY_DOCUMENT_CATEGORY, entityBelongsToOrg, getEntityClientId } from "@/lib/api/entity-registry";
import { saveFile } from "@/lib/storage";
import type { DocumentCategory } from "@/generated/prisma";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
    }

    const resource = ENTITY_RESOURCE[entityType];
    if (!resource) return NextResponse.json({ error: "Unsupported entity type" }, { status: 400 });
    if (!session.user.isPlatformAdmin && !can(session.user.permissions, resource, "VIEW")) {
      throw new ApiError(403, `Missing permission ${resource}:VIEW`);
    }

    if (!(await entityBelongsToOrg(entityType, entityId, organizationId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (session.user.clientId) {
      const clientId = await getEntityClientId(entityType, entityId);
      if (clientId !== session.user.clientId) {
        throw new ApiError(403, "You can only access your own account's data");
      }
    }

    const documents = await prisma.document.findMany({
      where: { organizationId, entityType, entityId },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    const form = await request.formData();
    const file = form.get("file");
    const entityType = form.get("entityType");
    const entityId = form.get("entityId");

    if (!(file instanceof File) || typeof entityType !== "string" || typeof entityId !== "string") {
      return NextResponse.json({ error: "file, entityType, and entityId are required" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File must be non-empty and under 20MB" }, { status: 400 });
    }

    const resource = ENTITY_RESOURCE[entityType];
    if (!resource) return NextResponse.json({ error: "Unsupported entity type" }, { status: 400 });
    if (!session.user.isPlatformAdmin && !can(session.user.permissions, resource, "CREATE") && !can(session.user.permissions, resource, "EDIT")) {
      throw new ApiError(403, `Missing permission ${resource}:CREATE`);
    }

    if (!(await entityBelongsToOrg(entityType, entityId, organizationId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (session.user.clientId) {
      const clientId = await getEntityClientId(entityType, entityId);
      if (clientId !== session.user.clientId) {
        throw new ApiError(403, "You can only access your own account's data");
      }
    }

    const document = await prisma.document.create({
      data: {
        organizationId,
        category: (ENTITY_DOCUMENT_CATEGORY[entityType] ?? "OTHER") as DocumentCategory,
        entityType,
        entityId,
        name: file.name,
        storageKey: "",
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        uploadedById: session.user.id,
      },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const storageKey = await saveFile(organizationId, document.id, buffer);
    const updated = await prisma.document.update({ where: { id: document.id }, data: { storageKey } });

    return NextResponse.json({ document: updated }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
