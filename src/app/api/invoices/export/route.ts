import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { invoiceStatusValues } from "@/lib/validation/invoice";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["invoiceNumber"],
  filterField: "status",
  filterValues: invoiceStatusValues,
  sortFields: { created: "createdAt", number: "invoiceNumber", total: "grandTotal", due: "dueDate" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "invoices", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const invoices = await prisma.invoice.findMany({
      where: { organizationId, ...query.where },
      include: { client: { select: { id: true, name: true, companyName: true } } },
      orderBy: query.orderBy,
    });

    const csv = toCsv(invoices, [
      { header: "Invoice Number", value: (i) => i.invoiceNumber },
      { header: "Client Name", value: (i) => (i.client ? (i.client.companyName ?? i.client.name) : "") },
      { header: "Status", value: (i) => i.status },
      { header: "Grand Total", value: (i) => Number(i.grandTotal) },
      { header: "Amount Paid", value: (i) => Number(i.amountPaid) },
      { header: "Due Date", value: (i) => (i.dueDate ? i.dueDate.toISOString() : "") },
      { header: "Created At", value: (i) => i.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=invoices.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
