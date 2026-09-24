import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { contractStatusValues } from "@/lib/validation/contract";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["contractNumber"],
  filterField: "status",
  filterValues: contractStatusValues,
  sortFields: { created: "createdAt", number: "contractNumber", value: "contractValue", start: "startDate" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "contracts", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const contracts = await prisma.contract.findMany({
      where: { organizationId, ...query.where },
      include: { client: { select: { id: true, name: true, companyName: true } } },
      orderBy: query.orderBy,
    });

    const csv = toCsv(contracts, [
      { header: "Contract Number", value: (c) => c.contractNumber },
      { header: "Client Name", value: (c) => c.client.name },
      { header: "Status", value: (c) => c.status },
      { header: "Contract Value", value: (c) => Number(c.contractValue) },
      { header: "Start Date", value: (c) => c.startDate.toISOString() },
      { header: "End Date", value: (c) => (c.endDate ? c.endDate.toISOString() : "") },
      { header: "Created At", value: (c) => c.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=contracts.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
