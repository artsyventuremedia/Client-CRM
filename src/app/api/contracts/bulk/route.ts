import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { bulkActionSchema } from "@/lib/validation/bulk";
import { contractStatusValues } from "@/lib/validation/contract";
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
      requirePermission(session, "contracts", "EDIT");
      if (!value || !contractStatusValues.includes(value as (typeof contractStatusValues)[number])) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const result = await prisma.contract.updateMany({
        where: { id: { in: ids }, organizationId },
        data: { status: value as (typeof contractStatusValues)[number] },
      });
      await recordAudit({
        organizationId,
        userId: session.user.id,
        action: "contract.bulk_status_updated",
        entityType: "Contract",
        entityId: ids.join(","),
        newValue: { status: value, count: result.count },
      });
      return NextResponse.json({ count: result.count });
    }

    requirePermission(session, "contracts", "DELETE");
    const result = await prisma.contract.deleteMany({ where: { id: { in: ids }, organizationId } });
    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "contract.bulk_deleted",
      entityType: "Contract",
      entityId: ids.join(","),
      previousValue: { count: result.count },
    });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
