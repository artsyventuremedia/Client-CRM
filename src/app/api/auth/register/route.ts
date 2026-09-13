import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerOrgSchema } from "@/lib/validation/auth";
import { slugify } from "@/lib/slug";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { organizationName, ownerName, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const ownerRole = await prisma.role.findFirst({
    where: { organizationId: null, systemRole: "ORG_OWNER" },
  });
  const freePlan = await prisma.plan.findUnique({ where: { tier: "FREE" } });
  if (!ownerRole || !freePlan) {
    return NextResponse.json({ error: "Platform is not fully initialized" }, { status: 500 });
  }

  const baseSlug = slugify(organizationName) || "organization";
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const org = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: organizationName, slug },
      });

      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: freePlan.id,
          status: "TRIALING",
          billingCycle: "MONTHLY",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: normalizedEmail,
          name: ownerName,
          passwordHash,
          status: "ACTIVE",
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: ownerRole.id },
      });

      return organization;
    });

    return NextResponse.json({ organizationSlug: org.slug }, { status: 201 });
  } catch (error) {
    console.error("Organization registration failed", error);
    return NextResponse.json({ error: "Could not create organization" }, { status: 500 });
  }
}
