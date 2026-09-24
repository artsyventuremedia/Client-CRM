import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateAppointmentSchema } from "@/lib/validation/appointment";
import { recordAudit } from "@/lib/audit";

async function loadAppointmentOrThrow(id: string, organizationId: string) {
  const appointment = await prisma.appointment.findFirst({ where: { id, organizationId } });
  if (!appointment) throw new ApiError(404, "Appointment not found");
  return appointment;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "appointments", "VIEW");
    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        organizer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!appointment) throw new ApiError(404, "Appointment not found");

    return NextResponse.json({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "appointments", "EDIT");
    const { id } = await params;

    const existing = await loadAppointmentOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.clientId !== undefined ? { clientId: data.clientId || null } : {}),
        ...(data.agenda !== undefined ? { agenda: data.agenda || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
        ...(data.location !== undefined ? { location: data.location || null } : {}),
        ...(data.meetingUrl !== undefined ? { meetingUrl: data.meetingUrl || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "appointment.updated",
      entityType: "Appointment",
      entityId: appointment.id,
      previousValue: existing,
      newValue: appointment,
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "appointments", "DELETE");
    const { id } = await params;

    const existing = await loadAppointmentOrThrow(id, organizationId);
    await prisma.appointment.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "appointment.deleted",
      entityType: "Appointment",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
