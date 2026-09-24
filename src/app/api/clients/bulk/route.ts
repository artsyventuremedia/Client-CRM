import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { bulkActionSchema } from "@/lib/validation/bulk";
import { clientStatusValues } from "@/lib/validation/client";
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
      requirePermission(session, "clients", "EDIT");
      if (!value || !clientStatusValues.includes(value as (typeof clientStatusValues)[number])) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const result = await prisma.client.updateMany({
        where: { id: { in: ids }, organizationId },
        data: { status: value as (typeof clientStatusValues)[number] },
      });
      await recordAudit({
        organizationId,
        userId: session.user.id,
        action: "client.bulk_status_updated",
        entityType: "Client",
        entityId: ids.join(","),
        newValue: { status: value, count: result.count },
      });
      return NextResponse.json({ count: result.count });
    }

    requirePermission(session, "clients", "DELETE");
    const result = await prisma.client.deleteMany({ where: { id: { in: ids }, organizationId } });
    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "client.bulk_deleted",
      entityType: "Client",
      entityId: ids.join(","),
      previousValue: { count: result.count },
    });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
