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

const TASK_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  TODO: "neutral",
  IN_PROGRESS: "info",
  BLOCKED: "danger",
  IN_REVIEW: "warning",
  CLIENT_REVIEW: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "projects", "VIEW")) redirect("/dashboard");

  const project = await prisma.project.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      manager: { select: { id: true, name: true } },
      tasks: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      milestones: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!project) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "projects", "EDIT");
  const patchUrl = `/api/projects/${project.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            <EditableField patchUrl={patchUrl} field="name" value={project.name} canEdit={canEdit} />
          </h1>
          <Link href={`/clients/${project.client.id}`} className="text-sm text-slate-500 underline hover:text-slate-900">
            {project.client.companyName || project.client.name}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={STATUS_TONE[project.status] ?? "neutral"}>{project.status.replaceAll("_", " ")}</Badge>
          <Badge tone={PRIORITY_TONE[project.priority] ?? "neutral"}>{project.priority}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <p>
              Description:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="description"
                type="textarea"
                value={project.description ?? ""}
                canEdit={canEdit}
              />
            </p>
            <p>Start date: {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}</p>
            <p>
              Target date:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="targetDate"
                type="date"
                value={project.targetDate ? project.targetDate.toISOString().slice(0, 10) : ""}
                displayValue={project.targetDate ? new Date(project.targetDate).toLocaleDateString() : undefined}
                canEdit={canEdit}
              />
            </p>
            <p>
              Budget:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="budget"
                type="number"
                value={project.budget ? String(project.budget) : ""}
                displayValue={
                  project.budget
                    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
                        Number(project.budget),
                      )
                    : undefined
                }
                canEdit={canEdit}
              />
            </p>
            <p>Manager: {project.manager?.name ?? "Unassigned"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {project.tasks.length === 0 && <p className="text-slate-400">No tasks yet.</p>}
            {project.tasks.map((task) => (
              <div key={task.id} className="rounded border border-slate-100 p-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-800">{task.title}</p>
                  <Badge tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>{task.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {task.assignee?.name ?? "Unassigned"}
                  {task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {project.milestones.length === 0 && <p className="text-slate-400">No milestones yet.</p>}
            {project.milestones.map((milestone) => (
              <div key={milestone.id} className="flex justify-between rounded border border-slate-100 p-2">
                <div>
                  <p className="font-medium text-slate-800">{milestone.name}</p>
                  <p className="text-xs text-slate-400">
                    {milestone.dueDate ? `Due ${new Date(milestone.dueDate).toLocaleDateString()}` : "No due date"}
                  </p>
                </div>
                <Badge tone={milestone.completedAt ? "success" : "neutral"}>
                  {milestone.completedAt ? new Date(milestone.completedAt).toLocaleDateString() : "Pending"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <DocumentList entityType="Project" entityId={project.id} />
      <ActivityTimeline entityType="Project" entityId={project.id} />

    </div>
  );
}
