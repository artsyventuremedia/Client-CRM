import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { paymentStatusValues } from "@/lib/validation/payment";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["transactionId", "notes"],
  filterField: "status",
  filterValues: paymentStatusValues,
  sortFields: { created: "createdAt", amount: "amount", paid: "paidAt" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "payments", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const payments = await prisma.payment.findMany({
      where: { organizationId, ...query.where },
      include: {
        client: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: query.orderBy,
    });

    const csv = toCsv(payments, [
      { header: "Client Name", value: (p) => p.client?.name },
      { header: "Invoice Number", value: (p) => p.invoice?.invoiceNumber },
      { header: "Amount", value: (p) => Number(p.amount) },
      { header: "Method", value: (p) => p.method },
      { header: "Status", value: (p) => p.status },
      { header: "Paid At", value: (p) => (p.paidAt ? p.paidAt.toISOString() : "") },
      { header: "Created At", value: (p) => p.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=payments.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
