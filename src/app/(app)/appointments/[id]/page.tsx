import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { DocumentList } from "@/components/documents/document-list";
import { EditableField } from "@/components/detail/editable-field";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  SCHEDULED: "info",
  CONFIRMED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "danger",
  RESCHEDULED: "warning",
};

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "appointments", "VIEW")) redirect("/dashboard");

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      organizer: { select: { id: true, name: true, email: true } },
    },
  });
  if (!appointment) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "appointments", "EDIT");
  const patchUrl = `/api/appointments/${appointment.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            <EditableField patchUrl={patchUrl} field="title" value={appointment.title} canEdit={canEdit} />
          </h1>
          <p className="text-sm text-slate-500">{appointment.type.replaceAll("_", " ")}</p>
        </div>
        <Badge tone={STATUS_TONE[appointment.status] ?? "neutral"}>{appointment.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
          <p>
            Client:{" "}
            {appointment.client ? (
              <Link href={`/clients/${appointment.client.id}`} className="underline hover:text-slate-900">
                {appointment.client.name}
              </Link>
            ) : (
              "Internal"
            )}
          </p>
          <p>Organizer: {appointment.organizer?.name ?? "—"}</p>
          <p>
            Agenda:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="agenda"
              type="textarea"
              value={appointment.agenda ?? ""}
              canEdit={canEdit}
            />
          </p>
          <p>Notes: {appointment.notes ?? "—"}</p>
          <p>Start time: {new Date(appointment.startTime).toLocaleString()}</p>
          <p>End time: {new Date(appointment.endTime).toLocaleString()}</p>
          <p>
            Location:{" "}
            <EditableField patchUrl={patchUrl} field="location" value={appointment.location ?? ""} canEdit={canEdit} />
          </p>
          <p>
            Meeting URL:{" "}
            <EditableField patchUrl={patchUrl} field="meetingUrl" value={appointment.meetingUrl ?? ""} canEdit={canEdit} />
          </p>
        </CardContent>
      </Card>
      <DocumentList entityType="Appointment" entityId={appointment.id} />
      <ActivityTimeline entityType="Appointment" entityId={appointment.id} />

    </div>
  );
}
