import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { clientStatusValues } from "@/lib/validation/client";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["name", "companyName", "industry"],
  filterField: "status",
  filterValues: clientStatusValues,
  sortFields: { created: "createdAt", name: "name" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "clients", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const clients = await prisma.client.findMany({
      where: { organizationId, ...query.where },
      orderBy: query.orderBy,
    });

    const csv = toCsv(clients, [
      { header: "Name", value: (c) => c.name },
      { header: "Company Name", value: (c) => c.companyName },
      { header: "Industry", value: (c) => c.industry },
      { header: "Category", value: (c) => c.category },
      { header: "Status", value: (c) => c.status },
      { header: "Created At", value: (c) => c.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=clients.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
