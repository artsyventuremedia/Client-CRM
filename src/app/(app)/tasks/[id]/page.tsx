import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { DocumentList } from "@/components/documents/document-list";
import { EditableField } from "@/components/detail/editable-field";

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

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "tasks", "VIEW")) redirect("/dashboard");

  const task = await prisma.task.findFirst({
    where: { id, organizationId },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { name: true, email: true } },
    },
  });
  if (!task) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "tasks", "EDIT");
  const patchUrl = `/api/tasks/${task.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            <EditableField patchUrl={patchUrl} field="title" value={task.title} canEdit={canEdit} />
          </h1>
          <p className="text-sm text-slate-500">{task.project?.name ?? "No project"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={STATUS_TONE[task.status] ?? "neutral"}>{task.status.replaceAll("_", " ")}</Badge>
          <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>{task.priority}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
          <p>
            Description:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="description"
              type="textarea"
              value={task.description ?? ""}
              canEdit={canEdit}
            />
          </p>
          <p>
            Project:{" "}
            {task.project ? (
              <Link href={`/projects/${task.project.id}`} className="underline hover:text-slate-900">
                {task.project.name}
              </Link>
            ) : (
              "—"
            )}
          </p>
          <p>Assignee: {task.assignee?.name ?? "Unassigned"}</p>
          <p>Start date: {task.startDate ? new Date(task.startDate).toLocaleDateString() : "—"}</p>
          <p>
            Due date:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="dueDate"
              type="date"
              value={task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""}
              displayValue={task.dueDate ? new Date(task.dueDate).toLocaleDateString() : undefined}
              canEdit={canEdit}
            />
          </p>
          <p>
            Estimated hours:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="estimatedHours"
              type="number"
              value={task.estimatedHours ? String(task.estimatedHours) : ""}
              displayValue={task.estimatedHours ? Number(task.estimatedHours) : undefined}
              canEdit={canEdit}
            />
          </p>
          <p>Actual hours: {task.actualHours ? Number(task.actualHours) : "—"}</p>
        </CardContent>
      </Card>
      <DocumentList entityType="Task" entityId={task.id} />
      <ActivityTimeline entityType="Task" entityId={task.id} />

    </div>
  );
}
