import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { bulkActionSchema } from "@/lib/validation/bulk";
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
      requirePermission(session, "services", "EDIT");
      if (value !== "true" && value !== "false") {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const isActive = value === "true";
      const result = await prisma.service.updateMany({
        where: { id: { in: ids }, organizationId },
        data: { isActive },
      });
      await recordAudit({
        organizationId,
        userId: session.user.id,
        action: "service.bulk_status_updated",
        entityType: "Service",
        entityId: ids.join(","),
        newValue: { isActive, count: result.count },
      });
      return NextResponse.json({ count: result.count });
    }

    requirePermission(session, "services", "DELETE");
    const result = await prisma.service.deleteMany({ where: { id: { in: ids }, organizationId } });
    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "service.bulk_deleted",
      entityType: "Service",
      entityId: ids.join(","),
      previousValue: { count: result.count },
    });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
