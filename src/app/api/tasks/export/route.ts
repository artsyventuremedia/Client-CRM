import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { parseListSearchParams } from "@/lib/list-query";
import { taskStatusValues } from "@/lib/validation/task";
import { toCsv } from "@/lib/csv";

const QUERY_CONFIG = {
  searchFields: ["title"],
  filterField: "status",
  filterValues: taskStatusValues,
  sortFields: { created: "createdAt", due: "dueDate", title: "title" },
  defaultSort: "created",
};

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "tasks", "EXPORT");

    const { searchParams } = new URL(request.url);
    const query = parseListSearchParams(Object.fromEntries(searchParams), QUERY_CONFIG);

    const tasks = await prisma.task.findMany({
      where: { organizationId, ...query.where },
      include: {
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: query.orderBy,
    });

    const csv = toCsv(tasks, [
      { header: "Title", value: (t) => t.title },
      { header: "Project Name", value: (t) => t.project?.name },
      { header: "Assignee Name", value: (t) => t.assignee?.name },
      { header: "Priority", value: (t) => t.priority },
      { header: "Status", value: (t) => t.status },
      { header: "Due Date", value: (t) => (t.dueDate ? t.dueDate.toISOString() : "") },
      { header: "Created At", value: (t) => t.createdAt.toISOString() },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=tasks.csv",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
