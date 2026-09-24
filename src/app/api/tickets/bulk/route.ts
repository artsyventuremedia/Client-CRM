import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { bulkActionSchema } from "@/lib/validation/bulk";
import { ticketStatusValues } from "@/lib/validation/ticket";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    const body = await request.json().catch(() => null);
    const parsed = bulkActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { ids, action, value } = parsed.data;

    if (action === "updateStatus") {
      requirePermission(session, "tickets", "EDIT");
      if (!value || !ticketStatusValues.includes(value as (typeof ticketStatusValues)[number])) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const result = await prisma.ticket.updateMany({
        where: { id: { in: ids }, organizationId },
        data: {
          status: value as (typeof ticketStatusValues)[number],
          ...(value === "RESOLVED" ? { resolvedAt: new Date() } : {}),
          ...(value === "CLOSED" ? { closedAt: new Date() } : {}),
        },
      });
      await recordAudit({
        organizationId,
        userId: session.user.id,
        action: "ticket.bulk_status_updated",
        entityType: "Ticket",
        entityId: ids.join(","),
        newValue: { status: value, count: result.count },
      });
      return NextResponse.json({ count: result.count });
    }

    requirePermission(session, "tickets", "DELETE");
    const result = await prisma.ticket.deleteMany({ where: { id: { in: ids }, organizationId } });
    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "ticket.bulk_deleted",
      entityType: "Ticket",
      entityId: ids.join(","),
      previousValue: { count: result.count },
    });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
