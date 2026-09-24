import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreatePaymentDialog } from "@/components/payments/create-payment-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { paymentStatusValues } from "@/lib/validation/payment";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  PENDING: "neutral",
  PROCESSING: "info",
  SUCCESS: "success",
  FAILED: "danger",
  REFUNDED: "warning",
};

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const QUERY_CONFIG = {
  searchFields: ["transactionId", "notes"],
  filterField: "status",
  filterValues: paymentStatusValues,
  sortFields: { created: "createdAt", amount: "amount", paid: "paidAt" },
  defaultSort: "created",
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "payments", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "payments", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "payments", "DELETE");

  const [payments, total, clients, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { organizationId, ...query.where },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.payment.count({ where: { organizationId, ...query.where } }),
    prisma.client.findMany({
      where: { organizationId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
    prisma.invoice.findMany({
      where: { organizationId },
      select: { id: true, invoiceNumber: true, clientId: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows: DataTableRow[] = payments.map((payment) => ({
    id: payment.id,
    cells: [
      <span key="client">
        <Link href={`/payments/${payment.id}`} className="font-medium text-slate-900 hover:underline">
          {payment.client.name}
        </Link>
        {payment.client.companyName && (
          <span className="ml-1 text-xs text-slate-400">({payment.client.companyName})</span>
        )}
      </span>,
      <span key="invoice" className="text-slate-600">
        {payment.invoice ? (
          <Link href={`/invoices/${payment.invoice.id}`} className="underline hover:text-slate-900">
            {payment.invoice.invoiceNumber}
          </Link>
        ) : (
          "—"
        )}
      </span>,
      <span key="amount" className="text-slate-600">
        {currency.format(Number(payment.amount))}
      </span>,
      <span key="method" className="text-slate-600">
        {payment.method.replaceAll("_", " ")}
      </span>,
      <Badge key="status" tone={STATUS_TONE[payment.status] ?? "neutral"}>
        {payment.status}
      </Badge>,
      <span key="paidAt" className="text-slate-600">
        {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "—"}
      </span>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">Track payments received from clients and their linked invoices.</p>
        </div>
        <CreatePaymentDialog clients={clients} invoices={invoices} />
      </div>

      <ListToolbar
        searchPlaceholder="Search payments..."
        filterLabel="All statuses"
        filterOptions={paymentStatusValues.map((s) => ({ value: s, label: s }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "amount", label: "Amount" },
          { value: "paid", label: "Paid At" },
        ]}
        exportHref="/api/payments/export"
      />

      <SavedViewsMenu resource="payments" />

      <DataTable
        headers={["Client", "Invoice", "Amount", "Method", "Status", "Paid At"]}
        rows={rows}
        emptyMessage="No payments yet. Record your first payment to get started."
        bulkResource={canBulk ? "payments" : undefined}
        bulkStatusOptions={canBulk ? paymentStatusValues.map((s) => ({ value: s, label: s })) : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
