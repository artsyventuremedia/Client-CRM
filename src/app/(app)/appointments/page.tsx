import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateAppointmentDialog } from "@/components/appointments/create-appointment-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { appointmentStatusValues } from "@/lib/validation/appointment";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  SCHEDULED: "info",
  CONFIRMED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "danger",
  RESCHEDULED: "warning",
};

const QUERY_CONFIG = {
  searchFields: ["title", "location"],
  filterField: "status",
  filterValues: appointmentStatusValues,
  sortFields: { start: "startTime", created: "createdAt", title: "title" },
  defaultSort: "start",
};

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "appointments", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "appointments", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "appointments", "DELETE");

  const [appointments, total, clients] = await Promise.all([
    prisma.appointment.findMany({
      where: { organizationId, ...query.where },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        organizer: { select: { id: true, name: true } },
      },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.appointment.count({ where: { organizationId, ...query.where } }),
    prisma.client.findMany({
      where: { organizationId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: DataTableRow[] = appointments.map((appointment) => ({
    id: appointment.id,
    cells: [
      <Link key="title" href={`/appointments/${appointment.id}`} className="font-medium text-slate-900 hover:underline">
        {appointment.title}
      </Link>,
      <span key="client" className="text-slate-600">
        {appointment.client ? appointment.client.name : "Internal"}
      </span>,
      <span key="type" className="text-slate-600">
        {appointment.type.replaceAll("_", " ")}
      </span>,
      <span key="start" className="text-slate-600">
        {new Date(appointment.startTime).toLocaleString()}
      </span>,
      <span key="end" className="text-slate-600">
        {new Date(appointment.endTime).toLocaleString()}
      </span>,
      <Badge key="status" tone={STATUS_TONE[appointment.status] ?? "neutral"}>
        {appointment.status.replaceAll("_", " ")}
      </Badge>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">Schedule and track meetings with clients and prospects.</p>
        </div>
        <CreateAppointmentDialog clients={clients} />
      </div>

      <ListToolbar
        searchPlaceholder="Search appointments..."
        filterLabel="All statuses"
        filterOptions={appointmentStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "start", label: "Start Time" },
          { value: "created", label: "Created" },
          { value: "title", label: "Title" },
        ]}
        exportHref="/api/appointments/export"
      />

      <SavedViewsMenu resource="appointments" />

      <DataTable
        headers={["Title", "Client", "Type", "Start Time", "End Time", "Status"]}
        rows={rows}
        emptyMessage="No appointments yet. Schedule your first appointment to get started."
        bulkResource={canBulk ? "appointments" : undefined}
        bulkStatusOptions={
          canBulk ? appointmentStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined
        }
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
