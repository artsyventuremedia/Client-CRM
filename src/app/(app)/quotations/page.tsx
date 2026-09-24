import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateQuotationDialog } from "@/components/quotations/create-quotation-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { quotationStatusValues } from "@/lib/validation/quotation";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "info",
  SENT: "info",
  VIEWED: "info",
  NEGOTIATION: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  EXPIRED: "danger",
  CONVERTED: "success",
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const QUERY_CONFIG = {
  searchFields: ["quotationNumber"],
  filterField: "status",
  filterValues: quotationStatusValues,
  sortFields: { created: "createdAt", number: "quotationNumber", total: "grandTotal" },
  defaultSort: "created",
};

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "quotations", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "quotations", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "quotations", "DELETE");

  const [quotations, total, clients] = await Promise.all([
    prisma.quotation.findMany({
      where: { organizationId, ...query.where },
      include: { client: { select: { id: true, name: true, companyName: true } } },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.quotation.count({ where: { organizationId, ...query.where } }),
    prisma.client.findMany({
      where: { organizationId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: DataTableRow[] = quotations.map((quotation) => ({
    id: quotation.id,
    cells: [
      <Link key="number" href={`/quotations/${quotation.id}`} className="font-medium text-slate-900 hover:underline">
        {quotation.quotationNumber}
      </Link>,
      <span key="client" className="text-slate-600">
        {quotation.client ? (quotation.client.companyName ?? quotation.client.name) : "—"}
      </span>,
      <Badge key="status" tone={STATUS_TONE[quotation.status] ?? "neutral"}>
        {quotation.status}
      </Badge>,
      <span key="total" className="text-slate-600">
        {CURRENCY_FORMATTER.format(Number(quotation.grandTotal))}
      </span>,
      <span key="expiry" className="text-slate-600">
        {quotation.expiryDate ? new Date(quotation.expiryDate).toLocaleDateString() : "—"}
      </span>,
      <span key="created" className="text-slate-600">
        {new Date(quotation.createdAt).toLocaleDateString()}
      </span>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500">Create and track quotations sent to clients.</p>
        </div>
        <CreateQuotationDialog clients={clients} />
      </div>

      <ListToolbar
        searchPlaceholder="Search quotations..."
        filterLabel="All statuses"
        filterOptions={quotationStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "number", label: "Quotation Number" },
          { value: "total", label: "Grand Total" },
        ]}
        exportHref="/api/quotations/export"
      />

      <SavedViewsMenu resource="quotations" />

      <DataTable
        headers={["Quotation Number", "Client", "Status", "Grand Total", "Expiry Date", "Created"]}
        rows={rows}
        emptyMessage="No quotations yet. Create your first quotation to get started."
        bulkResource={canBulk ? "quotations" : undefined}
        bulkStatusOptions={canBulk ? quotationStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
