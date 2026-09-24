import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createTaskSchema, taskStatusValues } from "@/lib/validation/task";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tasks", "VIEW");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(status && taskStatusValues.includes(status as (typeof taskStatusValues)[number])
        ? { status: status as (typeof taskStatusValues)[number] }
        : {}),
      ...(search
        ? {
            OR: [{ title: { contains: search, mode: "insensitive" as const } }],
          }
        : {}),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({ tasks, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tasks", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        organizationId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        projectId: parsed.data.projectId || null,
        assigneeId: parsed.data.assigneeId || null,
        priority: parsed.data.priority ?? "MEDIUM",
        dueDate: parsed.data.dueDate,
        estimatedHours: parsed.data.estimatedHours,
        createdById: session.user.id,
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "task.created",
      entityType: "Task",
      entityId: task.id,
      newValue: task,
    });

    if (task.assigneeId && task.assigneeId !== session.user.id) {
      await notify({
        organizationId,
        userId: task.assigneeId,
        event: "task.assigned",
        title: "New task assigned to you",
        body: task.title,
        data: { url: `/tasks/${task.id}` },
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
