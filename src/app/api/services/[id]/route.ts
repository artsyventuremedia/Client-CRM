import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateServiceSchema } from "@/lib/validation/service";
import { recordAudit } from "@/lib/audit";

async function loadServiceOrThrow(id: string, organizationId: string) {
  const service = await prisma.service.findFirst({ where: { id, organizationId } });
  if (!service) throw new ApiError(404, "Service not found");
  return service;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "services", "VIEW");
    const { id } = await params;

    const service = await prisma.service.findFirst({
      where: { id, organizationId },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!service) throw new ApiError(404, "Service not found");

    return NextResponse.json({ service });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "services", "EDIT");
    const { id } = await params;

    const existing = await loadServiceOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    let categoryId: string | null | undefined = undefined;
    if (data.categoryName !== undefined) {
      if (data.categoryName) {
        const category = await prisma.serviceCategory.upsert({
          where: { organizationId_name: { organizationId, name: data.categoryName } },
          update: {},
          create: { organizationId, name: data.categoryName },
        });
        categoryId = category.id;
      } else {
        categoryId = null;
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(data.pricingModel !== undefined ? { pricingModel: data.pricingModel } : {}),
        ...(data.oneTimePrice !== undefined ? { oneTimePrice: data.oneTimePrice } : {}),
        ...(data.monthlyPrice !== undefined ? { monthlyPrice: data.monthlyPrice } : {}),
        ...(data.quarterlyPrice !== undefined ? { quarterlyPrice: data.quarterlyPrice } : {}),
        ...(data.halfYearlyPrice !== undefined ? { halfYearlyPrice: data.halfYearlyPrice } : {}),
        ...(data.annualPrice !== undefined ? { annualPrice: data.annualPrice } : {}),
        ...(data.taxRatePercent !== undefined ? { taxRatePercent: data.taxRatePercent } : {}),
        ...(data.defaultDiscountPercent !== undefined ? { defaultDiscountPercent: data.defaultDiscountPercent } : {}),
        ...(data.slaDays !== undefined ? { slaDays: data.slaDays } : {}),
        ...(data.durationDays !== undefined ? { durationDays: data.durationDays } : {}),
        ...(data.renewalCycle !== undefined ? { renewalCycle: data.renewalCycle } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "service.updated",
      entityType: "Service",
      entityId: service.id,
      previousValue: existing,
      newValue: service,
    });

    return NextResponse.json({ service });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "services", "DELETE");
    const { id } = await params;

    const existing = await loadServiceOrThrow(id, organizationId);
    await prisma.service.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "service.deleted",
      entityType: "Service",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
