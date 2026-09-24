import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { createInvoiceSchema, invoiceStatusValues } from "@/lib/validation/invoice";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "invoices", "VIEW");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(status && invoiceStatusValues.includes(status as (typeof invoiceStatusValues)[number])
        ? { status: status as (typeof invoiceStatusValues)[number] }
        : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: "insensitive" as const } },
              { client: { name: { contains: search, mode: "insensitive" as const } } },
              { client: { companyName: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { client: { select: { id: true, name: true, companyName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({ invoices, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "invoices", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
      throw new ApiError(404, "Organization not found");
    }

    const count = await prisma.invoice.count({ where: { organizationId } });
    const invoiceNumber = `${organization.invoicePrefix}-${String(count + 1).padStart(4, "0")}`;

    const data = parsed.data;
    const quantity = data.quantity;
    const unitPrice = data.unitPrice;
    const discountPercent = 0;
    const taxPercent = 0;

    const subtotal = quantity * unitPrice;
    const discountTotal = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountTotal;
    const taxTotal = taxableAmount * (taxPercent / 100);
    const lineTotal = taxableAmount + taxTotal;
    const grandTotal = lineTotal;

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          organizationId,
          invoiceNumber,
          clientId: data.clientId,
          dueDate: data.dueDate ?? null,
          paymentTerms: data.paymentTerms || null,
          notes: data.notes || null,
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
        },
      });

      await tx.invoiceItem.create({
        data: {
          invoiceId: created.id,
          description: data.description,
          quantity,
          unitPrice,
          discountPercent,
          taxPercent,
          lineTotal,
        },
      });

      return tx.invoice.findUniqueOrThrow({
        where: { id: created.id },
        include: { items: true, client: { select: { id: true, name: true, companyName: true } } },
      });
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "invoice.created",
      entityType: "Invoice",
      entityId: invoice.id,
      newValue: invoice,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
