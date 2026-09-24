import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createAppointmentSchema, appointmentStatusValues } from "@/lib/validation/appointment";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "appointments", "VIEW");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(status && appointmentStatusValues.includes(status as (typeof appointmentStatusValues)[number])
        ? { status: status as (typeof appointmentStatusValues)[number] }
        : {}),
    };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, companyName: true } },
          organizer: { select: { id: true, name: true } },
        },
        orderBy: { startTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json({ appointments, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "appointments", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        organizationId,
        organizerId: session.user.id,
        clientId: parsed.data.clientId || null,
        title: parsed.data.title,
        agenda: parsed.data.agenda || null,
        notes: parsed.data.notes || null,
        type: parsed.data.type,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        location: parsed.data.location || null,
        meetingUrl: parsed.data.meetingUrl || null,
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "appointment.created",
      entityType: "Appointment",
      entityId: appointment.id,
      newValue: appointment,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
