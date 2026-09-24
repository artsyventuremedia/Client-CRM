import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateClientDialog } from "@/components/clients/create-client-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { clientStatusValues } from "@/lib/validation/client";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  AT_RISK: "warning",
  RENEWAL_RISK: "warning",
  PAYMENT_RISK: "danger",
  CHURNED: "danger",
};

const QUERY_CONFIG = {
  searchFields: ["name", "companyName", "industry"],
  filterField: "status",
  filterValues: clientStatusValues,
  sortFields: { created: "createdAt", name: "name" },
  defaultSort: "created",
};

export default async function ClientsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "clients", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "clients", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "clients", "DELETE");

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId, ...query.where },
      include: {
        salesOwner: { select: { name: true } },
        accountManager: { select: { name: true } },
        _count: { select: { projects: true, invoices: true, tickets: true } },
      },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.client.count({ where: { organizationId, ...query.where } }),
  ]);

  const rows: DataTableRow[] = clients.map((client) => ({
    id: client.id,
    cells: [
      <Link key="name" href={`/clients/${client.id}`} className="font-medium text-slate-900 hover:underline">
        {client.companyName ?? client.name}
      </Link>,
      <span key="category" className="text-slate-600">
        {client.category.replaceAll("_", " ")}
      </span>,
      <Badge key="status" tone={STATUS_TONE[client.status] ?? "neutral"}>
        {client.status.replaceAll("_", " ")}
      </Badge>,
      <span key="manager" className="text-slate-600">
        {client.accountManager?.name ?? "Unassigned"}
      </span>,
      <span key="projects" className="text-slate-600">
        {client._count.projects}
      </span>,
      <span key="invoices" className="text-slate-600">
        {client._count.invoices}
      </span>,
      <span key="tickets" className="text-slate-600">
        {client._count.tickets}
      </span>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">Your complete client roster with a 360-degree view.</p>
        </div>
        <CreateClientDialog />
      </div>

      <ListToolbar
        searchPlaceholder="Search clients..."
        filterLabel="All statuses"
        filterOptions={clientStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "name", label: "Name" },
        ]}
        exportHref="/api/clients/export"
      />

      <SavedViewsMenu resource="clients" />

      <DataTable
        headers={["Client", "Category", "Status", "Account Manager", "Projects", "Invoices", "Open Tickets"]}
        rows={rows}
        emptyMessage="No clients yet. Convert a lead or create a client directly."
        bulkResource={canBulk ? "clients" : undefined}
        bulkStatusOptions={canBulk ? clientStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
