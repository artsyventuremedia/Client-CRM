import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { createPaymentSchema, paymentStatusValues } from "@/lib/validation/payment";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "payments", "VIEW");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(status && paymentStatusValues.includes(status as (typeof paymentStatusValues)[number])
        ? { status: status as (typeof paymentStatusValues)[number] }
        : {}),
      ...(clientId ? { clientId } : {}),
      ...(search
        ? {
            OR: [
              { transactionId: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, companyName: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ payments, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "payments", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    let invoice: { id: string; grandTotal: unknown; amountPaid: unknown } | null = null;
    if (data.invoiceId) {
      invoice = await prisma.invoice.findFirst({
        where: { id: data.invoiceId, organizationId, clientId: data.clientId },
        select: { id: true, grandTotal: true, amountPaid: true },
      });
      if (!invoice) {
        throw new ApiError(404, "Invoice not found for this client");
      }
    }

    const isSuccess = data.status === "SUCCESS";

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          organizationId,
          clientId: data.clientId,
          invoiceId: data.invoiceId || null,
          amount: data.amount,
          method: data.method,
          status: data.status,
          transactionId: data.transactionId || null,
          notes: data.notes || null,
          paidAt: isSuccess ? new Date() : null,
        },
      });

      if (isSuccess && invoice) {
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: { amountPaid: { increment: data.amount } },
          select: { amountPaid: true, grandTotal: true },
        });

        const amountPaid = Number(updatedInvoice.amountPaid);
        const grandTotal = Number(updatedInvoice.grandTotal);

        if (amountPaid >= grandTotal) {
          await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });
        } else if (amountPaid > 0) {
          await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PARTIALLY_PAID" } });
        }
      }

      return created;
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "payment.created",
      entityType: "Payment",
      entityId: payment.id,
      newValue: payment,
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
