import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ApiError, handleApiError } from "@/lib/api/guard";
import { updateOrgApprovalSchema } from "@/lib/validation/organization-approval";
import { recordAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!session.user.isPlatformAdmin) throw new ApiError(403, "Platform admin access required");
    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { users: true, clients: true } } },
    });
    if (!organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    return NextResponse.json({ organization });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!session.user.isPlatformAdmin) throw new ApiError(403, "Platform admin access required");
    const { id } = await params;

    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = updateOrgApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const organization = await prisma.organization.update({ where: { id }, data: parsed.data });

    await recordAudit({
      organizationId: id,
      userId: session.user.id,
      action: "organization.admin_approval_updated",
      entityType: "Organization",
      entityId: id,
      previousValue: { adminsCanManageUsers: existing.adminsCanManageUsers, adminAssignableRoles: existing.adminAssignableRoles },
      newValue: parsed.data,
    });

    return NextResponse.json({ organization });
  } catch (error) {
    return handleApiError(error);
  }
}
