import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createAutomationRuleSchema } from "@/lib/validation/automation";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "automations", "VIEW");

    const rules = await prisma.automationRule.findMany({
      where: { organizationId },
      include: { actions: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "automations", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createAutomationRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const rule = await prisma.automationRule.create({
      data: {
        organizationId,
        name: parsed.data.name,
        triggerEvent: parsed.data.triggerEvent,
        actions: {
          create: [{ actionType: parsed.data.actionType, actionConfig: JSON.parse(JSON.stringify(parsed.data.actionConfig)), order: 0 }],
        },
      },
      include: { actions: true },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "automation_rule.created",
      entityType: "AutomationRule",
      entityId: rule.id,
      newValue: rule,
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
