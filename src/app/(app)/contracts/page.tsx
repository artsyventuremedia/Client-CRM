import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateContractDialog } from "@/components/contracts/create-contract-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { contractStatusValues } from "@/lib/validation/contract";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "info",
  SENT: "info",
  UNDER_REVIEW: "info",
  ACTIVE: "success",
  EXPIRING: "warning",
  EXPIRED: "danger",
  RENEWED: "success",
  TERMINATED: "danger",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const QUERY_CONFIG = {
  searchFields: ["contractNumber"],
  filterField: "status",
  filterValues: contractStatusValues,
  sortFields: { created: "createdAt", number: "contractNumber", value: "contractValue", start: "startDate" },
  defaultSort: "created",
};

export default async function ContractsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "contracts", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "contracts", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "contracts", "DELETE");

  const [contracts, total, clients] = await Promise.all([
    prisma.contract.findMany({
      where: { organizationId, ...query.where },
      include: { client: { select: { id: true, name: true, companyName: true } } },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.contract.count({ where: { organizationId, ...query.where } }),
    prisma.client.findMany({
      where: { organizationId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: DataTableRow[] = contracts.map((contract) => ({
    id: contract.id,
    cells: [
      <Link key="number" href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:underline">
        {contract.contractNumber}
      </Link>,
      <span key="client" className="text-slate-600">
        {contract.client.name}
        {contract.client.companyName ? ` (${contract.client.companyName})` : ""}
      </span>,
      <Badge key="status" tone={STATUS_TONE[contract.status] ?? "neutral"}>
        {contract.status.replaceAll("_", " ")}
      </Badge>,
      <span key="value" className="text-slate-600">
        {currencyFormatter.format(Number(contract.contractValue))}
      </span>,
      <span key="start" className="text-slate-600">
        {new Date(contract.startDate).toLocaleDateString()}
      </span>,
      <span key="end" className="text-slate-600">
        {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "—"}
      </span>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Contracts</h1>
          <p className="text-sm text-slate-500">Track client contracts from draft through renewal.</p>
        </div>
        <CreateContractDialog clients={clients} />
      </div>

      <ListToolbar
        searchPlaceholder="Search contracts..."
        filterLabel="All statuses"
        filterOptions={contractStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "number", label: "Contract Number" },
          { value: "value", label: "Contract Value" },
          { value: "start", label: "Start Date" },
        ]}
        exportHref="/api/contracts/export"
      />

      <SavedViewsMenu resource="contracts" />

      <DataTable
        headers={["Contract Number", "Client", "Status", "Contract Value", "Start Date", "End Date"]}
        rows={rows}
        emptyMessage="No contracts yet. Create your first contract to get started."
        bulkResource={canBulk ? "contracts" : undefined}
        bulkStatusOptions={canBulk ? contractStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
