import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { bulkActionSchema } from "@/lib/validation/bulk";
import { projectStatusValues } from "@/lib/validation/project";
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
      requirePermission(session, "projects", "EDIT");
      if (!value || !projectStatusValues.includes(value as (typeof projectStatusValues)[number])) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const result = await prisma.project.updateMany({
        where: { id: { in: ids }, organizationId },
        data: { status: value as (typeof projectStatusValues)[number] },
      });
      await recordAudit({
        organizationId,
        userId: session.user.id,
        action: "project.bulk_status_updated",
        entityType: "Project",
        entityId: ids.join(","),
        newValue: { status: value, count: result.count },
      });
      return NextResponse.json({ count: result.count });
    }

    requirePermission(session, "projects", "DELETE");
    const result = await prisma.project.deleteMany({ where: { id: { in: ids }, organizationId } });
    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "project.bulk_deleted",
      entityType: "Project",
      entityId: ids.join(","),
      previousValue: { count: result.count },
    });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
