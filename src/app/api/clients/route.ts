import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createClientSchema } from "@/lib/validation/client";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "clients", "VIEW");

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
              { companyName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          salesOwner: { select: { id: true, name: true } },
          accountManager: { select: { id: true, name: true } },
          _count: { select: { projects: true, invoices: true, tickets: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({ clients, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "clients", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    if (data.leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: data.leadId, organizationId } });
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
    }

    const client = await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          organizationId,
          name: data.name,
          companyName: data.companyName || null,
          category: data.category ?? "BUSINESS",
          industry: data.industry || null,
          gstNumber: data.gstNumber || null,
          panNumber: data.panNumber || null,
          salesOwnerId: data.salesOwnerId || session.user.id,
          accountManagerId: data.accountManagerId || null,
        },
      });

      if (data.leadId) {
        await tx.lead.update({
          where: { id: data.leadId },
          data: { status: "WON", convertedClientId: created.id },
        });
      }

      return created;
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "client.created",
      entityType: "Client",
      entityId: client.id,
      newValue: client,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
