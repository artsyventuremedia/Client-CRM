import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateProjectSchema } from "@/lib/validation/project";
import { recordAudit } from "@/lib/audit";

async function loadProjectOrThrow(id: string, organizationId: string) {
  const project = await prisma.project.findFirst({ where: { id, organizationId } });
  if (!project) throw new ApiError(404, "Project not found");
  return project;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "projects", "VIEW");
    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        manager: { select: { id: true, name: true } },
        tasks: { orderBy: { createdAt: "desc" } },
        milestones: { orderBy: { dueDate: "asc" } },
      },
    });
    if (!project) throw new ApiError(404, "Project not found");

    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "projects", "EDIT");
    const { id } = await params;

    const existing = await loadProjectOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.managerId !== undefined ? { managerId: data.managerId || null } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
        ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
        ...(data.budget !== undefined ? { budget: data.budget } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "project.updated",
      entityType: "Project",
      entityId: project.id,
      previousValue: existing,
      newValue: project,
    });

    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "projects", "DELETE");
    const { id } = await params;

    const existing = await loadProjectOrThrow(id, organizationId);
    await prisma.project.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "project.deleted",
      entityType: "Project",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
