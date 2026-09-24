import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { vendorStatusValues } from "@/lib/validation/vendor";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["companyName", "location"],
  filterField: "status",
  filterValues: vendorStatusValues,
  sortFields: { created: "createdAt", name: "companyName", rating: "rating" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "vendors", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const vendors = await prisma.vendor.findMany({
      where: { organizationId, ...query.where },
      orderBy: query.orderBy,
    });

    const csv = toCsv(vendors, [
      { header: "Company Name", value: (v) => v.companyName },
      { header: "Skills", value: (v) => v.skills.join("; ") },
      { header: "Location", value: (v) => v.location },
      { header: "Status", value: (v) => v.status },
      { header: "Rating", value: (v) => (v.rating ? Number(v.rating) : "") },
      { header: "Created At", value: (v) => v.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=vendors.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
