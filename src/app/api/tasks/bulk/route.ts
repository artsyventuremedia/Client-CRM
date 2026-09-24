import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { bulkActionSchema } from "@/lib/validation/bulk";
import { taskStatusValues } from "@/lib/validation/task";
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
      requirePermission(session, "tasks", "EDIT");
      if (!value || !taskStatusValues.includes(value as (typeof taskStatusValues)[number])) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const result = await prisma.task.updateMany({
        where: { id: { in: ids }, organizationId },
        data: { status: value as (typeof taskStatusValues)[number] },
      });
      await recordAudit({
        organizationId,
        userId: session.user.id,
        action: "task.bulk_status_updated",
        entityType: "Task",
        entityId: ids.join(","),
        newValue: { status: value, count: result.count },
      });
      return NextResponse.json({ count: result.count });
    }

    requirePermission(session, "tasks", "DELETE");
    const result = await prisma.task.deleteMany({ where: { id: { in: ids }, organizationId } });
    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "task.bulk_deleted",
      entityType: "Task",
      entityId: ids.join(","),
      previousValue: { count: result.count },
    });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
