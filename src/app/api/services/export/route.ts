import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { pricingModelValues } from "@/lib/validation/service";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["name", "description"],
  filterField: "pricingModel",
  filterValues: pricingModelValues,
  sortFields: { created: "createdAt", name: "name" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "services", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const services = await prisma.service.findMany({
      where: { organizationId, ...query.where },
      include: { category: { select: { name: true } } },
      orderBy: query.orderBy,
    });

    const csv = toCsv(services, [
      { header: "Name", value: (s) => s.name },
      { header: "Category", value: (s) => s.category?.name },
      { header: "Pricing Model", value: (s) => s.pricingModel },
      { header: "One-Time Price", value: (s) => (s.oneTimePrice ? Number(s.oneTimePrice) : "") },
      { header: "Monthly Price", value: (s) => (s.monthlyPrice ? Number(s.monthlyPrice) : "") },
      { header: "Annual Price", value: (s) => (s.annualPrice ? Number(s.annualPrice) : "") },
      { header: "Active", value: (s) => (s.isActive ? "Yes" : "No") },
      { header: "Created At", value: (s) => s.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=services.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
