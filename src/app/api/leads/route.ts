import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createLeadSchema, leadStatusValues } from "@/lib/validation/lead";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "leads", "VIEW");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(status && leadStatusValues.includes(status as (typeof leadStatusValues)[number])
        ? { status: status as (typeof leadStatusValues)[number] }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { company: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({ leads, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "leads", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        name: parsed.data.name,
        company: parsed.data.company || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        source: parsed.data.source || null,
        requirement: parsed.data.requirement || null,
        estimatedValue: parsed.data.estimatedValue,
        priority: parsed.data.priority ?? "MEDIUM",
        assignedToId: parsed.data.assignedToId || session.user.id,
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "lead.created",
      entityType: "Lead",
      entityId: lead.id,
      newValue: lead,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
