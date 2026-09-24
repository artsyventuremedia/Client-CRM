import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { quotationStatusValues } from "@/lib/validation/quotation";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["quotationNumber"],
  filterField: "status",
  filterValues: quotationStatusValues,
  sortFields: { created: "createdAt", number: "quotationNumber", total: "grandTotal" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "quotations", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const quotations = await prisma.quotation.findMany({
      where: { organizationId, ...query.where },
      include: { client: { select: { id: true, name: true, companyName: true } } },
      orderBy: query.orderBy,
    });

    const csv = toCsv(quotations, [
      { header: "Quotation Number", value: (q) => q.quotationNumber },
      { header: "Client Name", value: (q) => (q.client ? (q.client.companyName ?? q.client.name) : "") },
      { header: "Status", value: (q) => q.status },
      { header: "Grand Total", value: (q) => Number(q.grandTotal) },
      { header: "Expiry Date", value: (q) => (q.expiryDate ? q.expiryDate.toISOString() : "") },
      { header: "Created At", value: (q) => q.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=quotations.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
