import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateContractSchema } from "@/lib/validation/contract";
import { recordAudit } from "@/lib/audit";

async function loadContractOrThrow(id: string, organizationId: string) {
  const contract = await prisma.contract.findFirst({ where: { id, organizationId } });
  if (!contract) throw new ApiError(404, "Contract not found");
  return contract;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "contracts", "VIEW");
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, organizationId },
      include: { client: { select: { id: true, name: true, companyName: true } } },
    });
    if (!contract) throw new ApiError(404, "Contract not found");

    return NextResponse.json({ contract });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "contracts", "EDIT");
    const { id } = await params;

    const existing = await loadContractOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ?? null } : {}),
        ...(data.contractValue !== undefined ? { contractValue: data.contractValue } : {}),
        ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms || null } : {}),
        ...(data.renewalTerms !== undefined ? { renewalTerms: data.renewalTerms || null } : {}),
        ...(data.slaTerms !== undefined ? { slaTerms: data.slaTerms || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "contract.updated",
      entityType: "Contract",
      entityId: contract.id,
      previousValue: existing,
      newValue: contract,
    });

    return NextResponse.json({ contract });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "contracts", "DELETE");
    const { id } = await params;

    const existing = await loadContractOrThrow(id, organizationId);
    await prisma.contract.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "contract.deleted",
      entityType: "Contract",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
