import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { updateAutomationRuleSchema } from "@/lib/validation/automation";
import { recordAudit } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "automations", "EDIT");

    const existing = await prisma.automationRule.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Automation rule not found" }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = updateAutomationRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const rule = await prisma.automationRule.update({ where: { id }, data: { isActive: parsed.data.isActive } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "automation_rule.updated",
      entityType: "AutomationRule",
      entityId: rule.id,
      previousValue: existing,
      newValue: rule,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "automations", "DELETE");

    const existing = await prisma.automationRule.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Automation rule not found" }, { status: 404 });

    await prisma.automationRule.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "automation_rule.deleted",
      entityType: "AutomationRule",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
