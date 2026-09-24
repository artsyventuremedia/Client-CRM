import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { projectStatusValues } from "@/lib/validation/project";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  PLANNING: "neutral",
  NOT_STARTED: "neutral",
  IN_PROGRESS: "info",
  ON_HOLD: "warning",
  REVIEW: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const PRIORITY_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const QUERY_CONFIG = {
  searchFields: ["name"],
  filterField: "status",
  filterValues: projectStatusValues,
  sortFields: { created: "createdAt", name: "name", target: "targetDate" },
  defaultSort: "created",
};

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "projects", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "projects", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "projects", "DELETE");

  const [projects, total, clients, managers] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId, ...query.where },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        manager: { select: { id: true, name: true } },
      },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.project.count({ where: { organizationId, ...query.where } }),
    prisma.client.findMany({
      where: { organizationId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: DataTableRow[] = projects.map((project) => ({
    id: project.id,
    cells: [
      <Link key="name" href={`/projects/${project.id}`} className="font-medium text-slate-900 hover:underline">
        {project.name}
      </Link>,
      <span key="client" className="text-slate-600">
        {project.client.companyName || project.client.name}
      </span>,
      <span key="manager" className="text-slate-600">
        {project.manager?.name ?? "Unassigned"}
      </span>,
      <Badge key="status" tone={STATUS_TONE[project.status] ?? "neutral"}>
        {project.status.replaceAll("_", " ")}
      </Badge>,
      <Badge key="priority" tone={PRIORITY_TONE[project.priority] ?? "neutral"}>
        {project.priority}
      </Badge>,
      <span key="target" className="text-slate-600">
        {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : "—"}
      </span>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">Track delivery work from kickoff through completion.</p>
        </div>
        <CreateProjectDialog clients={clients} managers={managers} />
      </div>

      <ListToolbar
        searchPlaceholder="Search projects..."
        filterLabel="All statuses"
        filterOptions={projectStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "name", label: "Name" },
          { value: "target", label: "Target Date" },
        ]}
        exportHref="/api/projects/export"
      />

      <SavedViewsMenu resource="projects" />

      <DataTable
        headers={["Name", "Client", "Manager", "Status", "Priority", "Target Date"]}
        rows={rows}
        emptyMessage="No projects yet. Create your first project to get started."
        bulkResource={canBulk ? "projects" : undefined}
        bulkStatusOptions={canBulk ? projectStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
