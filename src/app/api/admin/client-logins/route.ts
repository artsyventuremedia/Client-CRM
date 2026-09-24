import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";
import { createClientLoginSchema } from "@/lib/validation/admin";
import { generateTempPassword } from "@/lib/security/temp-password";
import { recordAudit } from "@/lib/audit";
import { requireAdminUserManagementApproval } from "@/lib/api/admin-approval";
import { recordPendingCredential } from "@/lib/pending-credentials";

async function resolveOrganizationId(session: Awaited<ReturnType<typeof requireSession>>, body: unknown) {
  if (session.user.isPlatformAdmin) {
    const organizationId = (body as { organizationId?: string })?.organizationId;
    if (!organizationId) throw new ApiError(400, "organizationId is required");
    return organizationId;
  }
  if (!session.user.organizationId) throw new ApiError(403, "This action requires an organization context");
  requirePermission(session, "clients", "MANAGE");
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
    if (!session.user.isPlatformAdmin) requirePermission(session, "clients", "VIEW");

    const contacts = await prisma.clientContact.findMany({
      where: { client: { organizationId }, userId: { not: null } },
      include: { client: { select: { id: true, name: true, companyName: true } }, user: { select: { id: true, email: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const organizationId = await resolveOrganizationId(session, body);

    const parsed = createClientLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { clientId, name, email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    await requireAdminUserManagementApproval(session, organizationId, "CLIENT");

    const client = await prisma.client.findFirst({ where: { id: clientId, organizationId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const existing = await prisma.user.findFirst({ where: { organizationId, email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists in this organization" }, { status: 409 });
    }

    const clientRole = await prisma.role.findFirst({ where: { organizationId: null, systemRole: "CLIENT" } });
    if (!clientRole) throw new ApiError(500, "CLIENT role is not configured for this system");

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
      await tx.userRole.create({ data: { userId: user.id, roleId: clientRole.id } });
      await tx.clientContact.create({
        data: { clientId, userId: user.id, name, email: normalizedEmail, isPrimary: false },
      });
      return user;
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "client_login.created",
      entityType: "User",
      entityId: user.id,
      newValue: { email: user.email, clientId },
    });

    await recordPendingCredential({
      organizationId,
      userId: user.id,
      email: user.email,
      tempPassword,
      role: "CLIENT",
      createdById: session.user.id,
    });

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name }, tempPassword }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
