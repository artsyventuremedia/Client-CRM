import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateInvoiceSchema } from "@/lib/validation/invoice";
import { recordAudit } from "@/lib/audit";

async function loadInvoiceOrThrow(id: string, organizationId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id, organizationId } });
  if (!invoice) throw new ApiError(404, "Invoice not found");
  return invoice;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "invoices", "VIEW");
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        items: true,
        client: { select: { id: true, name: true, companyName: true } },
      },
    });
    if (!invoice) throw new ApiError(404, "Invoice not found");

    return NextResponse.json({ invoice });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "invoices", "EDIT");
    const { id } = await params;

    const existing = await loadInvoiceOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId || undefined } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ?? null } : {}),
        ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.amountPaid !== undefined ? { amountPaid: data.amountPaid } : {}),
      },
      include: { items: true, client: { select: { id: true, name: true, companyName: true } } },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "invoice.updated",
      entityType: "Invoice",
      entityId: invoice.id,
      previousValue: existing,
      newValue: invoice,
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "invoices", "DELETE");
    const { id } = await params;

    const existing = await loadInvoiceOrThrow(id, organizationId);
    await prisma.invoice.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "invoice.deleted",
      entityType: "Invoice",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
