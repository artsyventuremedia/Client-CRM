import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";
import { can } from "@/lib/rbac/check";
import { ENTITY_RESOURCE, ENTITY_ROUTE, entityBelongsToOrg, getEntityClientId, getEntityOwnerId } from "@/lib/api/entity-registry";
import { createCommentSchema } from "@/lib/validation/comment";
import { notify } from "@/lib/notify";

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
    requirePermission(session, resource, "VIEW");

    if (!(await entityBelongsToOrg(entityType, entityId, organizationId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (session.user.clientId) {
      const clientId = await getEntityClientId(entityType, entityId);
      if (clientId !== session.user.clientId) {
        throw new ApiError(403, "You can only access your own account's data");
      }
    }

    const comments = await prisma.comment.findMany({
      where: { organizationId, entityType, entityId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    const body = await request.json().catch(() => null);
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { entityType, entityId, content } = parsed.data;

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

    const comment = await prisma.comment.create({
      data: { organizationId, entityType, entityId, authorId: session.user.id, content },
      include: { author: { select: { name: true } } },
    });

    const ownerId = await getEntityOwnerId(entityType, entityId);
    if (ownerId && ownerId !== session.user.id) {
      await notify({
        organizationId,
        userId: ownerId,
        event: "comment.created",
        title: `New comment from ${comment.author.name}`,
        body: content,
        data: { url: `/${ENTITY_ROUTE[entityType]}/${entityId}` },
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
