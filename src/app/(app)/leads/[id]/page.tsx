import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{lead.name}</h1>
          <p className="text-sm text-slate-500">{lead.company ?? "Individual lead"}</p>
        </div>
        <Badge tone="info">{lead.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <p>Email: {lead.email ?? "—"}</p>
            <p>Phone: {lead.phone ?? "—"}</p>
            <p>Source: {lead.source ?? "—"}</p>
            <p>Assigned to: {lead.assignedTo?.name ?? "Unassigned"}</p>
            <p>
              Estimated value:{" "}
              {lead.estimatedValue
                ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(lead.estimatedValue))
                : "—"}
            </p>
            <p>Requirement: {lead.requirement ?? "—"}</p>
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
    </div>
  );
}
