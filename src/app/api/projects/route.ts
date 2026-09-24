import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createProjectSchema } from "@/lib/validation/project";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "projects", "VIEW");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { client: { name: { contains: search, mode: "insensitive" as const } } },
              { client: { companyName: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, companyName: true } },
          manager: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({ projects, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "projects", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        organizationId,
        clientId: parsed.data.clientId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        managerId: parsed.data.managerId || null,
        startDate: parsed.data.startDate,
        targetDate: parsed.data.targetDate,
        budget: parsed.data.budget,
        priority: parsed.data.priority ?? "MEDIUM",
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "project.created",
      entityType: "Project",
      entityId: project.id,
      newValue: project,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
