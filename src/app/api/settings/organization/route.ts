import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { updateOrganizationSchema } from "@/lib/validation/organization";
import { recordAudit } from "@/lib/audit";

export async function PATCH(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "settings", "EDIT");

    const body = await request.json().catch(() => null);
    const parsed = updateOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: parsed.data,
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "organization.settings_updated",
      entityType: "Organization",
      entityId: organizationId,
      newValue: parsed.data,
    });

    return NextResponse.json({ organization: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
