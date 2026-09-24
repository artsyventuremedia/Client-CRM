import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";
import { createEmployeeSchema } from "@/lib/validation/admin";
import { generateTempPassword } from "@/lib/security/temp-password";
import { recordAudit } from "@/lib/audit";
import { requireAdminUserManagementApproval } from "@/lib/api/admin-approval";
import { recordPendingCredential } from "@/lib/pending-credentials";

async function resolveOrganizationId(session: Awaited<ReturnType<typeof requireSession>>, body: unknown) {
  if (session.user.isPlatformAdmin) {
    const organizationId = (body as { organizationId?: string })?.organizationId;
    if (!organizationId) throw new ApiError(400, "organizationId is required");
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new ApiError(404, "Organization not found");
    return organizationId;
  }
  if (!session.user.organizationId) throw new ApiError(403, "This action requires an organization context");
  requirePermission(session, "users", "CREATE");
  return session.user.organizationId;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const organizationId = session.user.isPlatformAdmin
      ? searchParams.get("organizationId")
      : session.user.organizationId;
    if (!organizationId) throw new ApiError(400, "organizationId is required");
    if (!session.user.isPlatformAdmin) requirePermission(session, "users", "VIEW");

    const users = await prisma.user.findMany({
      where: { organizationId, roles: { some: { role: { systemRole: { not: "CLIENT" } } } } },
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const organizationId = await resolveOrganizationId(session, body);

    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, email, systemRole } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    await requireAdminUserManagementApproval(session, organizationId, systemRole);

    const existing = await prisma.user.findFirst({ where: { organizationId, email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists in this organization" }, { status: 409 });
    }

    const role =
      (await prisma.role.findFirst({ where: { organizationId, systemRole } })) ??
      (await prisma.role.findFirst({ where: { organizationId: null, systemRole } }));
    if (!role) throw new ApiError(500, "Role is not configured for this system");

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId,
          email: normalizedEmail,
          name,
          passwordHash,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });
      await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
      await tx.employee.create({ data: { userId: user.id } });
      return user;
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "employee.created",
      entityType: "User",
      entityId: user.id,
      newValue: { email: user.email, systemRole },
    });

    await recordPendingCredential({
      organizationId,
      userId: user.id,
      email: user.email,
      tempPassword,
      role: systemRole,
      createdById: session.user.id,
    });

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name }, tempPassword }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
