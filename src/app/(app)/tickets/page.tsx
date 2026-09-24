import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateTicketDialog } from "@/components/tickets/create-ticket-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { ticketStatusValues } from "@/lib/validation/ticket";

const PRIORITY_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  OPEN: "info",
  ASSIGNED: "warning",
  IN_PROGRESS: "warning",
  WAITING_FOR_CLIENT: "neutral",
  WAITING_FOR_VENDOR: "neutral",
  RESOLVED: "success",
  CLOSED: "neutral",
  REOPENED: "danger",
};

const QUERY_CONFIG = {
  searchFields: ["subject", "ticketNumber"],
  filterField: "status",
  filterValues: ticketStatusValues,
  sortFields: { created: "createdAt", number: "ticketNumber" },
  defaultSort: "created",
};

export default async function TicketsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "tickets", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "tickets", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "tickets", "DELETE");

  const [tickets, total, clients, assignees] = await Promise.all([
    prisma.ticket.findMany({
      where: { organizationId, ...query.where },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.ticket.count({ where: { organizationId, ...query.where } }),
    prisma.client.findMany({
      where: { organizationId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: DataTableRow[] = tickets.map((ticket) => ({
    id: ticket.id,
    cells: [
      <Link key="number" href={`/tickets/${ticket.id}`} className="font-medium text-slate-900 hover:underline">
        {ticket.ticketNumber}
      </Link>,
      <span key="subject" className="text-slate-600">
        {ticket.subject}
      </span>,
      <span key="client" className="text-slate-600">
        {ticket.client.companyName || ticket.client.name}
      </span>,
      <Badge key="priority" tone={PRIORITY_TONE[ticket.priority] ?? "neutral"}>
        {ticket.priority}
      </Badge>,
      <Badge key="status" tone={STATUS_TONE[ticket.status] ?? "neutral"}>
        {ticket.status.replaceAll("_", " ")}
      </Badge>,
      <span key="assignee" className="text-slate-600">
        {ticket.assignee?.name ?? "Unassigned"}
      </span>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500">Track and resolve client support requests.</p>
        </div>
        <CreateTicketDialog clients={clients} assignees={assignees} />
      </div>

      <ListToolbar
        searchPlaceholder="Search tickets..."
        filterLabel="All statuses"
        filterOptions={ticketStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "number", label: "Ticket Number" },
        ]}
        exportHref="/api/tickets/export"
      />

      <SavedViewsMenu resource="tickets" />

      <DataTable
        headers={["Ticket Number", "Subject", "Client", "Priority", "Status", "Assignee"]}
        rows={rows}
        emptyMessage="No tickets yet. Create your first ticket to get started."
        bulkResource={canBulk ? "tickets" : undefined}
        bulkStatusOptions={
          canBulk ? ticketStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined
        }
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
