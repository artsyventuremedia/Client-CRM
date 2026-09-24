import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession, ApiError, handleApiError } from "@/lib/api/guard";
import { createOrgOwnerSchema } from "@/lib/validation/admin";
import { slugify } from "@/lib/slug";
import { generateTempPassword } from "@/lib/security/temp-password";
import { recordAudit } from "@/lib/audit";
import { recordPendingCredential } from "@/lib/pending-credentials";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session.user.isPlatformAdmin) throw new ApiError(403, "Platform admin access required");

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true, clients: true } } },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session.user.isPlatformAdmin) throw new ApiError(403, "Platform admin access required");

    const body = await request.json().catch(() => null);
    const parsed = createOrgOwnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { organizationName, ownerName, email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const ownerRole = await prisma.role.findFirst({ where: { organizationId: null, systemRole: "ORG_OWNER" } });
    const freePlan = await prisma.plan.findUnique({ where: { tier: "FREE" } });
    if (!ownerRole || !freePlan) {
      throw new ApiError(500, "Platform is not fully initialized");
    }

    const existing = await prisma.user.findFirst({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const baseSlug = slugify(organizationName) || "organization";
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const { organization, owner } = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: organizationName, slug } });

      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: freePlan.id,
          status: "TRIALING",
          billingCycle: "MONTHLY",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      const owner = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: normalizedEmail,
          name: ownerName,
          passwordHash,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });

      await tx.userRole.create({ data: { userId: owner.id, roleId: ownerRole.id } });

      return { organization, owner };
    });

    await recordAudit({
      organizationId: organization.id,
      userId: session.user.id,
      action: "organization.created_by_platform_admin",
      entityType: "Organization",
      entityId: organization.id,
      newValue: { organization, ownerEmail: owner.email },
    });

    await recordPendingCredential({
      organizationId: organization.id,
      userId: owner.id,
      email: owner.email,
      tempPassword,
      role: "ORG_OWNER",
      createdById: session.user.id,
    });

    return NextResponse.json(
      { organization, owner: { id: owner.id, email: owner.email, name: owner.name }, tempPassword },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
