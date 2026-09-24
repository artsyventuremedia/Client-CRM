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
  CRITICAL: "danger",
};

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  OPEN: "info",
  ASSIGNED: "warning",
  IN_PROGRESS: "warning",
  WAITING_FOR_CLIENT: "neutral",
  WAITING_FOR_VENDOR: "neutral",
  RESOLVED: "success",
  CLOSED: "neutral",
  REOPENED: "danger",
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "tickets", "VIEW")) redirect("/dashboard");

  const ticket = await prisma.ticket.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      assignee: { select: { id: true, name: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
    },
  });
  if (!ticket) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "tickets", "EDIT");
  const patchUrl = `/api/tickets/${ticket.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {ticket.ticketNumber} —{" "}
            <EditableField patchUrl={patchUrl} field="subject" value={ticket.subject} canEdit={canEdit} />
          </h1>
          <p className="text-sm text-slate-500">{ticket.client.companyName || ticket.client.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={PRIORITY_TONE[ticket.priority] ?? "neutral"}>{ticket.priority}</Badge>
          <Badge tone={STATUS_TONE[ticket.status] ?? "neutral"}>{ticket.status.replaceAll("_", " ")}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <p>
              Client:{" "}
              <Link href={`/clients/${ticket.clientId}`} className="underline hover:text-slate-900">
                {ticket.client.companyName || ticket.client.name}
              </Link>
            </p>
            <p>
              Category:{" "}
              <EditableField patchUrl={patchUrl} field="category" value={ticket.category ?? ""} canEdit={canEdit} />
            </p>
            <p>Assignee: {ticket.assignee?.name ?? "Unassigned"}</p>
            <p>
              Description:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="description"
                type="textarea"
                value={ticket.description ?? ""}
                canEdit={canEdit}
              />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {ticket.comments.length === 0 && <p className="text-slate-400">No comments yet.</p>}
            {ticket.comments.map((comment) => (
              <div key={comment.id} className="border-b border-slate-50 pb-2">
                <span className="font-medium text-slate-800">{comment.author?.name ?? "Unknown"}</span> —{" "}
                {comment.content}
                <span className="ml-2 text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <DocumentList entityType="Ticket" entityId={ticket.id} />
      <ActivityTimeline entityType="Ticket" entityId={ticket.id} />

    </div>
  );
}
