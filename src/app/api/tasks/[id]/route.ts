import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateTaskSchema } from "@/lib/validation/task";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

async function loadTaskOrThrow(id: string, organizationId: string) {
  const task = await prisma.task.findFirst({ where: { id, organizationId } });
  if (!task) throw new ApiError(404, "Task not found");
  return task;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tasks", "VIEW");
    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: { id, organizationId },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new ApiError(404, "Task not found");

    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tasks", "EDIT");
    const { id } = await params;

    const existing = await loadTaskOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId || null } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId || null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
        ...(data.estimatedHours !== undefined ? { estimatedHours: data.estimatedHours } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "task.updated",
      entityType: "Task",
      entityId: task.id,
      previousValue: existing,
      newValue: task,
    });

    if (task.assigneeId && task.assigneeId !== existing.assigneeId && task.assigneeId !== session.user.id) {
      await notify({
        organizationId,
        userId: task.assigneeId,
        event: "task.assigned",
        title: "Task assigned to you",
        body: task.title,
        data: { url: `/tasks/${task.id}` },
      });
    }

    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tasks", "DELETE");
    const { id } = await params;

    const existing = await loadTaskOrThrow(id, organizationId);
    await prisma.task.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "task.deleted",
      entityType: "Task",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
