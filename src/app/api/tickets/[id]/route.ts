import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateTicketSchema } from "@/lib/validation/ticket";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

async function loadTicketOrThrow(id: string, organizationId: string) {
  const ticket = await prisma.ticket.findFirst({ where: { id, organizationId } });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  return ticket;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tickets", "VIEW");
    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, organizationId },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        assignee: { select: { id: true, name: true } },
        comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
      },
    });
    if (!ticket) throw new ApiError(404, "Ticket not found");

    return NextResponse.json({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tickets", "EDIT");
    const { id } = await params;

    const existing = await loadTicketOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.subject !== undefined ? { subject: data.subject } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.category !== undefined ? { category: data.category || null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
        ...(data.status === "CLOSED" ? { closedAt: new Date() } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "ticket.updated",
      entityType: "Ticket",
      entityId: ticket.id,
      previousValue: existing,
      newValue: ticket,
    });

    if (ticket.assigneeId && ticket.assigneeId !== existing.assigneeId && ticket.assigneeId !== session.user.id) {
      await notify({
        organizationId,
        userId: ticket.assigneeId,
        event: "ticket.assigned",
        title: "Ticket assigned to you",
        body: ticket.subject,
        data: { url: `/tickets/${ticket.id}` },
      });
    }

    if (data.status !== undefined && data.status !== existing.status) {
      const contact = await prisma.clientContact.findFirst({
        where: { clientId: ticket.clientId, userId: { not: null } },
        select: { userId: true },
      });
      if (contact?.userId && contact.userId !== session.user.id) {
        await notify({
          organizationId,
          userId: contact.userId,
          event: "ticket.status_changed",
          title: "Your ticket status changed",
          body: `${ticket.subject}: ${ticket.status.replaceAll("_", " ")}`,
          data: { url: `/tickets/${ticket.id}` },
        });
      }
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tickets", "DELETE");
    const { id } = await params;

    const existing = await loadTicketOrThrow(id, organizationId);
    await prisma.ticket.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "ticket.deleted",
      entityType: "Ticket",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
