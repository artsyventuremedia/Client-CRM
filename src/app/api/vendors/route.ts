import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createVendorSchema } from "@/lib/validation/vendor";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "vendors", "VIEW");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(search
        ? {
            companyName: { contains: search, mode: "insensitive" as const },
          }
        : {}),
    };

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vendor.count({ where }),
    ]);

    return NextResponse.json({ vendors, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "vendors", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createVendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const skills = data.skills
      ? data.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const vendor = await prisma.$transaction(async (tx) => {
      const created = await tx.vendor.create({
        data: {
          organizationId,
          companyName: data.companyName,
          skills,
          location: data.location || null,
          paymentTerms: data.paymentTerms || null,
          gstNumber: data.gstNumber || null,
          panNumber: data.panNumber || null,
        },
      });

      if (data.contactName) {
        await tx.vendorContact.create({
          data: {
            vendorId: created.id,
            name: data.contactName,
            email: data.contactEmail || null,
            phone: data.contactPhone || null,
            isPrimary: true,
          },
        });
      }

      return created;
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "vendor.created",
      entityType: "Vendor",
      entityId: vendor.id,
      newValue: vendor,
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
