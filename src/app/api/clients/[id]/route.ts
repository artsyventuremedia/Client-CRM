import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateClientSchema } from "@/lib/validation/client";
import { recordAudit } from "@/lib/audit";

async function loadClientOrThrow(id: string, organizationId: string) {
  const client = await prisma.client.findFirst({ where: { id, organizationId } });
  if (!client) throw new ApiError(404, "Client not found");
  return client;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "clients", "VIEW");
    const { id } = await params;

    const client = await prisma.client.findFirst({
      where: { id, organizationId },
      include: {
        salesOwner: { select: { id: true, name: true, email: true } },
        accountManager: { select: { id: true, name: true, email: true } },
        contacts: true,
        addresses: true,
        notes: { orderBy: { createdAt: "desc" } },
        opportunities: true,
        quotations: { orderBy: { createdAt: "desc" } },
        contracts: { orderBy: { createdAt: "desc" } },
        serviceOrders: { include: { service: true }, orderBy: { createdAt: "desc" } },
        projects: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        tickets: { orderBy: { createdAt: "desc" } },
        appointments: { orderBy: { startTime: "desc" } },
        renewals: { orderBy: { expiryDate: "asc" } },
        originatingLead: true,
      },
    });
    if (!client) throw new ApiError(404, "Client not found");

    const [activities, communications] = await Promise.all([
      prisma.activity.findMany({
        where: { organizationId, entityType: "Client", entityId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.communication.findMany({
        where: { organizationId, entityType: "Client", entityId: id },
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),
    ]);

    const outstanding = client.invoices.reduce(
      (sum, inv) => sum + (Number(inv.grandTotal) - Number(inv.amountPaid)),
      0,
    );

    return NextResponse.json({ client, activities, communications, outstanding });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "clients", "EDIT");
    const { id } = await params;

    const existing = await loadClientOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.companyName !== undefined ? { companyName: data.companyName || null } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.industry !== undefined ? { industry: data.industry || null } : {}),
        ...(data.gstNumber !== undefined ? { gstNumber: data.gstNumber || null } : {}),
        ...(data.panNumber !== undefined ? { panNumber: data.panNumber || null } : {}),
        ...(data.salesOwnerId !== undefined ? { salesOwnerId: data.salesOwnerId || null } : {}),
        ...(data.accountManagerId !== undefined ? { accountManagerId: data.accountManagerId || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "client.updated",
      entityType: "Client",
      entityId: client.id,
      previousValue: existing,
      newValue: client,
    });

    return NextResponse.json({ client });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "clients", "DELETE");
    const { id } = await params;

    const existing = await loadClientOrThrow(id, organizationId);
    await prisma.client.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "client.deleted",
      entityType: "Client",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
