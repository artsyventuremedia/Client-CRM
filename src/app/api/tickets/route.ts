import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createTicketSchema, ticketStatusValues } from "@/lib/validation/ticket";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { runAutomations } from "@/lib/automations/engine";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tickets", "VIEW");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(status && ticketStatusValues.includes(status as (typeof ticketStatusValues)[number])
        ? { status: status as (typeof ticketStatusValues)[number] }
        : {}),
      ...(search
        ? {
            OR: [{ subject: { contains: search, mode: "insensitive" as const } }],
          }
        : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, companyName: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ticket.count({ where }),
    ]);

    return NextResponse.json({ tickets, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tickets", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const count = await prisma.ticket.count({ where: { organizationId } });
    const ticketNumber = `TCK-${String(count + 1).padStart(4, "0")}`;

    const ticket = await prisma.ticket.create({
      data: {
        organizationId,
        ticketNumber,
        clientId: parsed.data.clientId,
        subject: parsed.data.subject,
        description: parsed.data.description || null,
        category: parsed.data.category || null,
        priority: parsed.data.priority ?? "MEDIUM",
        assigneeId: parsed.data.assigneeId || null,
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "ticket.created",
      entityType: "Ticket",
      entityId: ticket.id,
      newValue: ticket,
    });

    if (ticket.assigneeId && ticket.assigneeId !== session.user.id) {
      await notify({
        organizationId,
        userId: ticket.assigneeId,
        event: "ticket.assigned",
        title: "New ticket assigned to you",
        body: ticket.subject,
        data: { url: `/tickets/${ticket.id}` },
      });
    }

    await runAutomations(organizationId, "ticket.created", "Ticket", ticket);
    const finalTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });

    return NextResponse.json({ ticket: finalTicket }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
