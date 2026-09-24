import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { appointmentStatusValues } from "@/lib/validation/appointment";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["title", "location"],
  filterField: "status",
  filterValues: appointmentStatusValues,
  sortFields: { start: "startTime", created: "createdAt", title: "title" },
  defaultSort: "start",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "appointments", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const appointments = await prisma.appointment.findMany({
      where: { organizationId, ...query.where },
      include: { client: { select: { name: true } } },
      orderBy: query.orderBy,
    });

    const csv = toCsv(appointments, [
      { header: "Title", value: (a) => a.title },
      { header: "Client Name", value: (a) => a.client?.name },
      { header: "Type", value: (a) => a.type },
      { header: "Status", value: (a) => a.status },
      { header: "Start Time", value: (a) => a.startTime.toISOString() },
      { header: "End Time", value: (a) => a.endTime.toISOString() },
      { header: "Location", value: (a) => a.location },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=appointments.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
