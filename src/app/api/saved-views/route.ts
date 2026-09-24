import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/api/guard";
import { createSavedViewSchema } from "@/lib/validation/saved-view";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get("resource");
    if (!resource) return NextResponse.json({ error: "resource is required" }, { status: 400 });

    const views = await prisma.savedView.findMany({
      where: { userId: session.user.id, organizationId, resource },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ views });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    const body = await request.json().catch(() => null);
    const parsed = createSavedViewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.savedView.findUnique({
      where: { userId_resource_name: { userId: session.user.id, resource: parsed.data.resource, name: parsed.data.name } },
    });
    if (existing) {
      return NextResponse.json({ error: "You already have a saved view with this name" }, { status: 409 });
    }

    const view = await prisma.savedView.create({
      data: {
        userId: session.user.id,
        organizationId,
        resource: parsed.data.resource,
        name: parsed.data.name,
        params: parsed.data.params,
      },
    });

    return NextResponse.json({ view }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
