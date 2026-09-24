import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ApiError, handleApiError } from "@/lib/api/guard";
import { setFeatureToggleSchema, toggleableSystemRoles } from "@/lib/validation/admin";
import { RESOURCES } from "@/lib/rbac/matrix";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session.user.isPlatformAdmin) throw new ApiError(403, "Platform admin access required");

    const toggles = await prisma.roleFeatureToggle.findMany();
    const disabledSet = new Set(toggles.filter((t) => !t.enabled).map((t) => `${t.systemRole}:${t.resource}`));

    const grid = toggleableSystemRoles.map((systemRole) => ({
      systemRole,
      resources: RESOURCES.map((resource) => ({
        resource,
        enabled: !disabledSet.has(`${systemRole}:${resource}`),
      })),
    }));

    return NextResponse.json({ grid });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session.user.isPlatformAdmin) throw new ApiError(403, "Platform admin access required");

    const body = await request.json().catch(() => null);
    const parsed = setFeatureToggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { systemRole, resource, enabled } = parsed.data;

    await prisma.roleFeatureToggle.upsert({
      where: { systemRole_resource: { systemRole, resource } },
      update: { enabled },
      create: { systemRole, resource, enabled },
    });

    // Force any signed-in holder of this role to refresh permissions on their next request.
    await prisma.user.updateMany({
      where: { roles: { some: { role: { systemRole } } } },
      data: { tokenVersion: { increment: 1 } },
    });

    await recordAudit({
      organizationId: null,
      userId: session.user.id,
      action: "feature_toggle.changed",
      entityType: "RoleFeatureToggle",
      entityId: `${systemRole}:${resource}`,
      newValue: { systemRole, resource, enabled },
    });

    return NextResponse.json({ systemRole, resource, enabled });
  } catch (error) {
    return handleApiError(error);
  }
}
