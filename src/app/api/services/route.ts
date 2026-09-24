import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createServiceSchema } from "@/lib/validation/service";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "services", "VIEW");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(search
        ? {
            name: { contains: search, mode: "insensitive" as const },
          }
        : {}),
    };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.service.count({ where }),
    ]);

    return NextResponse.json({ services, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "services", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    let categoryId: string | null = null;
    if (parsed.data.categoryName) {
      const category = await prisma.serviceCategory.upsert({
        where: { organizationId_name: { organizationId, name: parsed.data.categoryName } },
        update: {},
        create: { organizationId, name: parsed.data.categoryName },
      });
      categoryId = category.id;
    }

    const service = await prisma.service.create({
      data: {
        organizationId,
        categoryId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        pricingModel: parsed.data.pricingModel ?? "ONE_TIME",
        oneTimePrice: parsed.data.oneTimePrice,
        monthlyPrice: parsed.data.monthlyPrice,
        quarterlyPrice: parsed.data.quarterlyPrice,
        halfYearlyPrice: parsed.data.halfYearlyPrice,
        annualPrice: parsed.data.annualPrice,
        taxRatePercent: parsed.data.taxRatePercent ?? 0,
        defaultDiscountPercent: parsed.data.defaultDiscountPercent ?? 0,
        slaDays: parsed.data.slaDays,
        durationDays: parsed.data.durationDays,
        renewalCycle: parsed.data.renewalCycle ?? "ANNUAL",
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "service.created",
      entityType: "Service",
      entityId: service.id,
      newValue: service,
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
