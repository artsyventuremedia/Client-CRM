import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateServiceDialog } from "@/components/services/create-service-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { pricingModelValues } from "@/lib/validation/service";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function priceFor(service: {
  pricingModel: string;
  renewalCycle: string;
  oneTimePrice: unknown;
  monthlyPrice: unknown;
  quarterlyPrice: unknown;
  halfYearlyPrice: unknown;
  annualPrice: unknown;
}) {
  if (service.pricingModel === "ONE_TIME" || service.pricingModel === "PROJECT_BASED") {
    return service.oneTimePrice;
  }
  switch (service.renewalCycle) {
    case "MONTHLY":
      return service.monthlyPrice;
    case "QUARTERLY":
      return service.quarterlyPrice;
    case "HALF_YEARLY":
      return service.halfYearlyPrice;
    case "ANNUAL":
      return service.annualPrice;
    default:
      return service.monthlyPrice ?? service.annualPrice;
  }
}

const QUERY_CONFIG = {
  searchFields: ["name", "description"],
  filterField: "pricingModel",
  filterValues: pricingModelValues,
  sortFields: { created: "createdAt", name: "name" },
  defaultSort: "created",
};

export default async function ServicesPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "services", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "services", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "services", "DELETE");

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where: { organizationId, ...query.where },
      include: { category: { select: { name: true } } },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.service.count({ where: { organizationId, ...query.where } }),
  ]);

  const rows: DataTableRow[] = services.map((service) => {
    const price = priceFor(service);
    return {
      id: service.id,
      cells: [
        <Link key="name" href={`/services/${service.id}`} className="font-medium text-slate-900 hover:underline">
          {service.name}
        </Link>,
        <span key="category" className="text-slate-600">
          {service.category?.name ?? "—"}
        </span>,
        <span key="pricingModel" className="text-slate-600">
          {service.pricingModel.replaceAll("_", " ")}
        </span>,
        <span key="price" className="text-slate-600">
          {price ? currency.format(Number(price)) : "—"}
        </span>,
        <Badge key="status" tone={service.isActive ? "success" : "neutral"}>
          {service.isActive ? "Active" : "Inactive"}
        </Badge>,
      ],
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Services</h1>
          <p className="text-sm text-slate-500">Manage the service catalog offered to clients.</p>
        </div>
        <CreateServiceDialog />
      </div>

      <ListToolbar
        searchPlaceholder="Search services..."
        filterLabel="All pricing models"
        filterOptions={pricingModelValues.map((v) => ({ value: v, label: v.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "name", label: "Name" },
        ]}
        exportHref="/api/services/export"
      />

      <SavedViewsMenu resource="services" />

      <DataTable
        headers={["Name", "Category", "Pricing Model", "Price", "Status"]}
        rows={rows}
        emptyMessage="No services yet. Create your first service to get started."
        bulkResource={canBulk ? "services" : undefined}
        bulkStatusOptions={canBulk ? [
          { value: "true", label: "Activate" },
          { value: "false", label: "Deactivate" },
        ] : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
