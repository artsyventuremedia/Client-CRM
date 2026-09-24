import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updatePaymentSchema } from "@/lib/validation/payment";
import { recordAudit } from "@/lib/audit";

async function loadPaymentOrThrow(id: string, organizationId: string) {
  const payment = await prisma.payment.findFirst({ where: { id, organizationId } });
  if (!payment) throw new ApiError(404, "Payment not found");
  return payment;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "payments", "VIEW");
    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: { id, organizationId },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        invoice: { select: { id: true, invoiceNumber: true, grandTotal: true, amountPaid: true } },
      },
    });
    if (!payment) throw new ApiError(404, "Payment not found");

    return NextResponse.json({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "payments", "EDIT");
    const { id } = await params;

    const existing = await loadPaymentOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.invoiceId !== undefined ? { invoiceId: data.invoiceId || null } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.method !== undefined ? { method: data.method } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.transactionId !== undefined ? { transactionId: data.transactionId || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "payment.updated",
      entityType: "Payment",
      entityId: payment.id,
      previousValue: existing,
      newValue: payment,
    });

    return NextResponse.json({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "payments", "DELETE");
    const { id } = await params;

    const existing = await loadPaymentOrThrow(id, organizationId);
    await prisma.payment.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "payment.deleted",
      entityType: "Payment",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
