import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { ticketStatusValues } from "@/lib/validation/ticket";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["subject", "ticketNumber"],
  filterField: "status",
  filterValues: ticketStatusValues,
  sortFields: { created: "createdAt", number: "ticketNumber" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tickets", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const tickets = await prisma.ticket.findMany({
      where: { organizationId, ...query.where },
      include: {
        client: { select: { name: true, companyName: true } },
        assignee: { select: { name: true } },
      },
      orderBy: query.orderBy,
    });

    const csv = toCsv(tickets, [
      { header: "Ticket Number", value: (t) => t.ticketNumber },
      { header: "Subject", value: (t) => t.subject },
      { header: "Client Name", value: (t) => t.client.companyName || t.client.name },
      { header: "Priority", value: (t) => t.priority },
      { header: "Status", value: (t) => t.status },
      { header: "Assignee Name", value: (t) => t.assignee?.name },
      { header: "Created At", value: (t) => t.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=tickets.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
