import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateVendorDialog } from "@/components/vendors/create-vendor-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { vendorStatusValues } from "@/lib/validation/vendor";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  BLACKLISTED: "danger",
  PENDING_APPROVAL: "warning",
};

const QUERY_CONFIG = {
  searchFields: ["companyName", "location"],
  filterField: "status",
  filterValues: vendorStatusValues,
  sortFields: { created: "createdAt", name: "companyName", rating: "rating" },
  defaultSort: "created",
};

export default async function VendorsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "vendors", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "vendors", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "vendors", "DELETE");

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where: { organizationId, ...query.where },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.vendor.count({ where: { organizationId, ...query.where } }),
  ]);

  const rows: DataTableRow[] = vendors.map((vendor) => ({
    id: vendor.id,
    cells: [
      <Link key="name" href={`/vendors/${vendor.id}`} className="font-medium text-slate-900 hover:underline">
        {vendor.companyName}
      </Link>,
      <span key="skills" className="text-slate-600">
        {vendor.skills.length > 0 ? vendor.skills.join(", ") : "—"}
      </span>,
      <span key="location" className="text-slate-600">
        {vendor.location ?? "—"}
      </span>,
      <Badge key="status" tone={STATUS_TONE[vendor.status] ?? "neutral"}>
        {vendor.status.replaceAll("_", " ")}
      </Badge>,
      <span key="rating" className="text-slate-600">
        {vendor.rating ? Number(vendor.rating).toFixed(2) : "—"}
      </span>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500">Manage vendors and their skills, contacts, and status.</p>
        </div>
        <CreateVendorDialog />
      </div>

      <ListToolbar
        searchPlaceholder="Search vendors..."
        filterLabel="All statuses"
        filterOptions={vendorStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "name", label: "Name" },
          { value: "rating", label: "Rating" },
        ]}
        exportHref="/api/vendors/export"
      />

      <SavedViewsMenu resource="vendors" />

      <DataTable
        headers={["Company Name", "Skills", "Location", "Status", "Rating"]}
        rows={rows}
        emptyMessage="No vendors yet. Create your first vendor to get started."
        bulkResource={canBulk ? "vendors" : undefined}
        bulkStatusOptions={canBulk ? vendorStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
