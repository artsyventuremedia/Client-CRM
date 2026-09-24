import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { leadStatusValues } from "@/lib/validation/lead";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["name", "company", "email"],
  filterField: "status",
  filterValues: leadStatusValues,
  sortFields: { created: "createdAt", name: "name", value: "estimatedValue" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "leads", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const leads = await prisma.lead.findMany({
      where: { organizationId, ...query.where },
      include: { assignedTo: { select: { name: true } } },
      orderBy: query.orderBy,
    });

    const csv = toCsv(leads, [
      { header: "Name", value: (l) => l.name },
      { header: "Company", value: (l) => l.company },
      { header: "Email", value: (l) => l.email },
      { header: "Status", value: (l) => l.status },
      { header: "Estimated Value", value: (l) => (l.estimatedValue ? Number(l.estimatedValue) : "") },
      { header: "Assigned To", value: (l) => l.assignedTo?.name },
      { header: "Created At", value: (l) => l.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=leads.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
