import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateLeadSchema } from "@/lib/validation/lead";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

async function loadLeadOrThrow(id: string, organizationId: string) {
  const lead = await prisma.lead.findFirst({ where: { id, organizationId } });
  if (!lead) throw new ApiError(404, "Lead not found");
  return lead;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "leads", "VIEW");
    const { id } = await params;

    const lead = await prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        activities: { orderBy: { createdAt: "desc" } },
        followups: { orderBy: { scheduledAt: "asc" } },
        notes: { orderBy: { createdAt: "desc" } },
        quotations: true,
      },
    });
    if (!lead) throw new ApiError(404, "Lead not found");

    return NextResponse.json({ lead });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "leads", "EDIT");
    const { id } = await params;

    const existing = await loadLeadOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.company !== undefined ? { company: data.company || null } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.source !== undefined ? { source: data.source || null } : {}),
        ...(data.requirement !== undefined ? { requirement: data.requirement || null } : {}),
        ...(data.estimatedValue !== undefined ? { estimatedValue: data.estimatedValue } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId || null } : {}),
        ...(data.status !== undefined ? { status: data.status, lastContactedAt: new Date() } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "lead.updated",
      entityType: "Lead",
      entityId: lead.id,
      previousValue: existing,
      newValue: lead,
    });

    if (lead.assignedToId && lead.assignedToId !== existing.assignedToId && lead.assignedToId !== session.user.id) {
      await notify({
        organizationId,
        userId: lead.assignedToId,
        event: "lead.assigned",
        title: "Lead assigned to you",
        body: lead.name,
        data: { url: `/leads/${lead.id}` },
      });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "leads", "DELETE");
    const { id } = await params;

    const existing = await loadLeadOrThrow(id, organizationId);
    await prisma.lead.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "lead.deleted",
      entityType: "Lead",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
