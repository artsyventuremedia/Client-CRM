import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { invoiceStatusValues } from "@/lib/validation/invoice";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "neutral",
  SENT: "info",
  VIEWED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "neutral",
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const QUERY_CONFIG = {
  searchFields: ["invoiceNumber"],
  filterField: "status",
  filterValues: invoiceStatusValues,
  sortFields: { created: "createdAt", number: "invoiceNumber", total: "grandTotal", due: "dueDate" },
  defaultSort: "created",
};

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "invoices", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "invoices", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "invoices", "DELETE");

  const [invoices, total, clients] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId, ...query.where },
      include: { client: { select: { id: true, name: true, companyName: true } } },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.invoice.count({ where: { organizationId, ...query.where } }),
    prisma.client.findMany({
      where: { organizationId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: DataTableRow[] = invoices.map((invoice) => ({
    id: invoice.id,
    cells: [
      <Link key="number" href={`/invoices/${invoice.id}`} className="font-medium text-slate-900 hover:underline">
        {invoice.invoiceNumber}
      </Link>,
      <span key="client" className="text-slate-600">
        {invoice.client ? (invoice.client.companyName ?? invoice.client.name) : "—"}
      </span>,
      <Badge key="status" tone={STATUS_TONE[invoice.status] ?? "neutral"}>
        {invoice.status.replaceAll("_", " ")}
      </Badge>,
      <span key="total" className="text-slate-600">
        {CURRENCY_FORMATTER.format(Number(invoice.grandTotal))}
      </span>,
      <span key="paid" className="text-slate-600">
        {CURRENCY_FORMATTER.format(Number(invoice.amountPaid))}
      </span>,
      <span key="due" className="text-slate-600">
        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
      </span>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">Issue and track invoices for your clients.</p>
        </div>
        <CreateInvoiceDialog clients={clients} />
      </div>

      <ListToolbar
        searchPlaceholder="Search invoices..."
        filterLabel="All statuses"
        filterOptions={invoiceStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "number", label: "Invoice Number" },
          { value: "total", label: "Grand Total" },
          { value: "due", label: "Due Date" },
        ]}
        exportHref="/api/invoices/export"
      />

      <SavedViewsMenu resource="invoices" />

      <DataTable
        headers={["Invoice Number", "Client", "Status", "Grand Total", "Amount Paid", "Due Date"]}
        rows={rows}
        emptyMessage="No invoices yet. Create your first invoice to get started."
        bulkResource={canBulk ? "invoices" : undefined}
        bulkStatusOptions={canBulk ? invoiceStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
