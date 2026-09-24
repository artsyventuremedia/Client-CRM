import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateQuotationSchema } from "@/lib/validation/quotation";
import { recordAudit } from "@/lib/audit";

async function loadQuotationOrThrow(id: string, organizationId: string) {
  const quotation = await prisma.quotation.findFirst({ where: { id, organizationId } });
  if (!quotation) throw new ApiError(404, "Quotation not found");
  return quotation;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "quotations", "VIEW");
    const { id } = await params;

    const quotation = await prisma.quotation.findFirst({
      where: { id, organizationId },
      include: {
        items: true,
        client: { select: { id: true, name: true, companyName: true } },
      },
    });
    if (!quotation) throw new ApiError(404, "Quotation not found");

    return NextResponse.json({ quotation });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "quotations", "EDIT");
    const { id } = await params;

    const existing = await loadQuotationOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateQuotationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId || null } : {}),
        ...(data.expiryDate !== undefined ? { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null } : {}),
        ...(data.terms !== undefined ? { terms: data.terms || null } : {}),
        ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: { items: true, client: { select: { id: true, name: true, companyName: true } } },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "quotation.updated",
      entityType: "Quotation",
      entityId: quotation.id,
      previousValue: existing,
      newValue: quotation,
    });

    return NextResponse.json({ quotation });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "quotations", "DELETE");
    const { id } = await params;

    const existing = await loadQuotationOrThrow(id, organizationId);
    await prisma.quotation.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "quotation.deleted",
      entityType: "Quotation",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
