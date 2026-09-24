import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { ListToolbar } from "@/components/list/list-toolbar";
import { SavedViewsMenu } from "@/components/list/saved-views-menu";
import { Pagination } from "@/components/list/pagination";
import { DataTable, type DataTableRow } from "@/components/list/data-table";
import { parseListSearchParams, type SearchParamsLike } from "@/lib/list-query";
import { taskStatusValues } from "@/lib/validation/task";

const PRIORITY_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  TODO: "neutral",
  IN_PROGRESS: "info",
  BLOCKED: "danger",
  IN_REVIEW: "warning",
  CLIENT_REVIEW: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

const QUERY_CONFIG = {
  searchFields: ["title"],
  filterField: "status",
  filterValues: taskStatusValues,
  sortFields: { created: "createdAt", due: "dueDate", title: "title" },
  defaultSort: "created",
};

export default async function TasksPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "tasks", "VIEW")) redirect("/dashboard");

  const sp = await searchParams;
  const query = parseListSearchParams(sp, QUERY_CONFIG);
  const canBulk = session.user.isPlatformAdmin || can(session.user.permissions, "tasks", "EDIT");
  const canBulkDelete = session.user.isPlatformAdmin || can(session.user.permissions, "tasks", "DELETE");

  const [tasks, total, projects, assignees] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId, ...query.where },
      include: {
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
    prisma.task.count({ where: { organizationId, ...query.where } }),
    prisma.project.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: DataTableRow[] = tasks.map((task) => ({
    id: task.id,
    cells: [
      <Link key="title" href={`/tasks/${task.id}`} className="font-medium text-slate-900 hover:underline">
        {task.title}
      </Link>,
      <span key="project" className="text-slate-600">
        {task.project?.name ?? "—"}
      </span>,
      <span key="assignee" className="text-slate-600">
        {task.assignee?.name ?? "Unassigned"}
      </span>,
      <Badge key="priority" tone={PRIORITY_TONE[task.priority] ?? "neutral"}>
        {task.priority}
      </Badge>,
      <Badge key="status" tone={STATUS_TONE[task.status] ?? "neutral"}>
        {task.status.replaceAll("_", " ")}
      </Badge>,
      <span key="due" className="text-slate-600">
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
      </span>,
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">Track work items across projects and clients.</p>
        </div>
        <CreateTaskDialog projects={projects} assignees={assignees} />
      </div>

      <ListToolbar
        searchPlaceholder="Search tasks..."
        filterLabel="All statuses"
        filterOptions={taskStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        sortOptions={[
          { value: "created", label: "Created" },
          { value: "due", label: "Due Date" },
          { value: "title", label: "Title" },
        ]}
        exportHref="/api/tasks/export"
      />

      <SavedViewsMenu resource="tasks" />

      <DataTable
        headers={["Title", "Project", "Assignee", "Priority", "Status", "Due Date"]}
        rows={rows}
        emptyMessage="No tasks yet. Create your first task to get started."
        bulkResource={canBulk ? "tasks" : undefined}
        bulkStatusOptions={canBulk ? taskStatusValues.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) : undefined}
        canBulkDelete={canBulkDelete}
      />

      <Pagination page={query.page} pageSize={query.pageSize} total={total} />
    </div>
  );
}
