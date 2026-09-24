import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateLeadDialog } from "@/components/leads/create-lead-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { leadStatusValues } from "@/lib/validation/lead";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  NEW: "info",
  CONTACTED: "info",
  QUALIFIED: "warning",
  REQUIREMENT_IDENTIFIED: "warning",
  PROPOSAL_SENT: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "danger",
};

const QUERY_CONFIG = {
  searchFields: ["name", "company", "email"],
  filterField: "status",
  filterValues: leadStatusValues,
  sortFields: { created: "createdAt", name: "name", value: "estimatedValue" },
  defaultSort: "created",
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "leads", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "leads", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "leads", "DELETE");

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId, ...query.where },
      include: { assignedTo: { select: { name: true } } },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.lead.count({ where: { organizationId, ...query.where } }),
  ]);

  const rows: DataTableRow[] = leads.map((lead) => ({
    id: lead.id,
    cells: [
      <Link key="name" href={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:underline">
        {lead.name}
      </Link>,
      <span key="company" className="text-slate-600">
        {lead.company ?? "—"}
      </span>,
      <Badge key="status" tone={STATUS_TONE[lead.status] ?? "neutral"}>
        {lead.status.replaceAll("_", " ")}
      </Badge>,
      <span key="value" className="text-slate-600">
        {lead.estimatedValue
          ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
              Number(lead.estimatedValue),
            )
          : "—"}
      </span>,
      <span key="assignee" className="text-slate-600">
        {lead.assignedTo?.name ?? "Unassigned"}
      </span>,
      <span key="followup" className="text-slate-600">
        {lead.nextFollowupAt ? new Date(lead.nextFollowupAt).toLocaleDateString() : "—"}
      </span>,
      lead.convertedAt ? (
        <Link key="converted" href={`/clients/${lead.convertedClientId}`} className="underline hover:text-slate-900">
          {new Date(lead.convertedAt).toLocaleDateString()}
        </Link>
      ) : (
        <span key="converted">—</span>
      ),
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">Track prospects from first contact through conversion.</p>
        </div>
        <CreateLeadDialog />
      </div>

      <ListToolbar
        searchPlaceholder="Search leads..."
        filterLabel="All statuses"
        filterOptions={leadStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "name", label: "Name" },
          { value: "value", label: "Est. Value" },
        ]}
        exportHref="/api/leads/export"
      />
      <SavedViewsMenu resource="leads" />

      <DataTable
        headers={["Name", "Company", "Status", "Est. Value", "Assigned To", "Next Follow-up", "Converted On"]}
        rows={rows}
        emptyMessage="No leads yet. Create your first lead to get started."
        bulkResource={canBulk ? "leads" : undefined}
        bulkStatusOptions={canBulk ? leadStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
