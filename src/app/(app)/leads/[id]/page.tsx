import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConvertLeadDialog } from "@/components/leads/convert-lead-dialog";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { DocumentList } from "@/components/documents/document-list";
import { EditableField } from "@/components/detail/editable-field";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "leads", "VIEW")) redirect("/dashboard");

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId },
    include: {
      assignedTo: { select: { name: true, email: true } },
      activities: { orderBy: { createdAt: "desc" } },
      followups: { orderBy: { scheduledAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      quotations: true,
    },
  });
  if (!lead) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "leads", "EDIT");
  const patchUrl = `/api/leads/${lead.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            <EditableField patchUrl={patchUrl} field="name" value={lead.name} canEdit={canEdit} />
          </h1>
          <p className="text-sm text-slate-500">
            <EditableField
              patchUrl={patchUrl}
              field="company"
              value={lead.company ?? ""}
              displayValue={lead.company ?? "Individual lead"}
              canEdit={canEdit}
            />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="info">{lead.status.replaceAll("_", " ")}</Badge>
          {lead.convertedClientId ? (
            <div className="text-right text-xs text-slate-500">
              <p>
                Converted to client on{" "}
                <span className="font-medium text-slate-700">
                  {lead.convertedAt ? new Date(lead.convertedAt).toLocaleDateString() : "—"}
                </span>
              </p>
              <Link href={`/clients/${lead.convertedClientId}`} className="text-slate-900 underline">
                View client
              </Link>
            </div>
          ) : (
            <ConvertLeadDialog
              leadId={lead.id}
              defaultName={lead.name}
              defaultCompanyName={lead.company ?? ""}
              defaultIndustry={lead.industry ?? ""}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <p>
              Email: <EditableField patchUrl={patchUrl} field="email" value={lead.email ?? ""} canEdit={canEdit} />
            </p>
            <p>
              Phone: <EditableField patchUrl={patchUrl} field="phone" value={lead.phone ?? ""} canEdit={canEdit} />
            </p>
            <p>
              Source: <EditableField patchUrl={patchUrl} field="source" value={lead.source ?? ""} canEdit={canEdit} />
            </p>
            <p>Assigned to: {lead.assignedTo?.name ?? "Unassigned"}</p>
            <p>
              Estimated value:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="estimatedValue"
                type="number"
                value={lead.estimatedValue ? String(lead.estimatedValue) : ""}
                displayValue={
                  lead.estimatedValue
                    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(lead.estimatedValue))
                    : undefined
                }
                canEdit={canEdit}
              />
            </p>
            <p>
              Requirement:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="requirement"
                type="textarea"
                value={lead.requirement ?? ""}
                canEdit={canEdit}
              />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {lead.followups.length === 0 && <p className="text-slate-400">No follow-ups scheduled.</p>}
            {lead.followups.map((f) => (
              <div key={f.id} className="rounded border border-slate-100 p-2">
                <p className="font-medium text-slate-800">{f.purpose}</p>
                <p className="text-xs text-slate-400">
                  {f.type} · {new Date(f.scheduledAt).toLocaleString()} · {f.status}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {lead.quotations.length === 0 && <p className="text-slate-400">No quotations yet.</p>}
            {lead.quotations.map((q) => (
              <div key={q.id} className="flex justify-between rounded border border-slate-100 p-2">
                <span>{q.quotationNumber}</span>
                <Badge tone="neutral">{q.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
          {lead.activities.length === 0 && lead.notes.length === 0 && (
            <p className="text-slate-400">No activity recorded yet.</p>
          )}
          {lead.activities.map((a) => (
            <div key={a.id} className="border-b border-slate-50 pb-2">
              <span className="font-medium text-slate-800">{a.type}</span> — {a.notes}
              <span className="ml-2 text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {lead.notes.map((n) => (
            <div key={n.id} className="border-b border-slate-50 pb-2">
              <span className="font-medium text-slate-800">Note</span> — {n.content}
              <span className="ml-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <DocumentList entityType="Lead" entityId={lead.id} />
      <ActivityTimeline entityType="Lead" entityId={lead.id} />
    </div>
  );
}
