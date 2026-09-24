import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { projectStatusValues } from "@/lib/validation/project";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["name"],
  filterField: "status",
  filterValues: projectStatusValues,
  sortFields: { created: "createdAt", name: "name", target: "targetDate" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "projects", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const projects = await prisma.project.findMany({
      where: { organizationId, ...query.where },
      include: {
        client: { select: { name: true, companyName: true } },
        manager: { select: { name: true } },
      },
      orderBy: query.orderBy,
    });

    const csv = toCsv(projects, [
      { header: "Name", value: (p) => p.name },
      { header: "Client Name", value: (p) => p.client.companyName || p.client.name },
      { header: "Manager Name", value: (p) => p.manager?.name },
      { header: "Status", value: (p) => p.status },
      { header: "Priority", value: (p) => p.priority },
      { header: "Start Date", value: (p) => (p.startDate ? p.startDate.toISOString() : "") },
      { header: "Target Date", value: (p) => (p.targetDate ? p.targetDate.toISOString() : "") },
      { header: "Budget", value: (p) => (p.budget ? Number(p.budget) : "") },
      { header: "Created At", value: (p) => p.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=projects.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
