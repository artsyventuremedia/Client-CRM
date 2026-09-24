import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { createQuotationSchema } from "@/lib/validation/quotation";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "quotations", "VIEW");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(search
        ? {
            OR: [
              { quotationNumber: { contains: search, mode: "insensitive" as const } },
              { client: { name: { contains: search, mode: "insensitive" as const } } },
              { client: { companyName: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: { client: { select: { id: true, name: true, companyName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.quotation.count({ where }),
    ]);

    return NextResponse.json({ quotations, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "quotations", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createQuotationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
      throw new ApiError(404, "Organization not found");
    }

    const count = await prisma.quotation.count({ where: { organizationId } });
    const quotationNumber = `${organization.quotationPrefix}-${String(count + 1).padStart(4, "0")}`;

    const data = parsed.data;
    const quantity = data.quantity;
    const unitPrice = data.unitPrice;
    const discountPercent = data.discountPercent ?? 0;
    const taxPercent = data.taxPercent ?? 0;

    const subtotal = quantity * unitPrice;
    const discountTotal = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountTotal;
    const taxTotal = taxableAmount * (taxPercent / 100);
    const lineTotal = taxableAmount + taxTotal;
    const grandTotal = lineTotal;

    const quotation = await prisma.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: {
          organizationId,
          quotationNumber,
          clientId: data.clientId,
          salespersonId: session.user.id,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          terms: data.terms || null,
          paymentTerms: data.paymentTerms || null,
          notes: data.notes || null,
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
        },
      });

      await tx.quotationItem.create({
        data: {
          quotationId: created.id,
          description: data.description,
          quantity,
          unitPrice,
          discountPercent,
          taxPercent,
          lineTotal,
        },
      });

      return tx.quotation.findUniqueOrThrow({
        where: { id: created.id },
        include: { items: true, client: { select: { id: true, name: true, companyName: true } } },
      });
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "quotation.created",
      entityType: "Quotation",
      entityId: quotation.id,
      newValue: quotation,
    });

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
