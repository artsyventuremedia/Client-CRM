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

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  AT_RISK: "warning",
  RENEWAL_RISK: "warning",
  PAYMENT_RISK: "danger",
  CHURNED: "danger",
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "clients", "VIEW")) redirect("/dashboard");

  const client = await prisma.client.findFirst({
    where: { id, organizationId },
    include: {
      salesOwner: { select: { name: true } },
      accountManager: { select: { name: true } },
      contacts: true,
      addresses: true,
      notes: { orderBy: { createdAt: "desc" } },
      quotations: { orderBy: { createdAt: "desc" } },
      contracts: { orderBy: { createdAt: "desc" } },
      serviceOrders: { include: { service: true }, orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
      tickets: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { startTime: "desc" } },
      renewals: { orderBy: { expiryDate: "asc" } },
      originatingLead: { select: { id: true, name: true, convertedAt: true } },
    },
  });
  if (!client) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "clients", "EDIT");
  const patchUrl = `/api/clients/${client.id}`;

  const outstanding = client.invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) - Number(inv.amountPaid)), 0);
  const totalInvoiced = client.invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
  const activeServices = client.serviceOrders.filter((so) => so.status === "ACTIVE").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            <EditableField
              patchUrl={patchUrl}
              field="name"
              value={client.name}
              displayValue={client.companyName ?? client.name}
              canEdit={canEdit}
            />
          </h1>
          <p className="text-sm text-slate-500">
            {client.category.replaceAll("_", " ")} ·{" "}
            <EditableField
              patchUrl={patchUrl}
              field="industry"
              value={client.industry ?? ""}
              displayValue={client.industry ?? "Industry not set"}
              canEdit={canEdit}
            />
          </p>
          {client.originatingLead?.convertedAt && (
            <p className="mt-1 text-xs text-slate-400">
              Converted from lead &quot;{client.originatingLead.name}&quot; on{" "}
              {new Date(client.originatingLead.convertedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {can(session.user.permissions, "kickoff_documents", "VIEW") && (
            <Link href={`/clients/${client.id}/kickoff`} className="text-sm text-slate-600 underline hover:text-slate-900">
              Kickoff Document
            </Link>
          )}
          {can(session.user.permissions, "content_sheets", "VIEW") && (
            <Link href={`/clients/${client.id}/content-sheets`} className="text-sm text-slate-600 underline hover:text-slate-900">
              Content Sheets
            </Link>
          )}
          <Badge tone={STATUS_TONE[client.status] ?? "neutral"}>{client.status.replaceAll("_", " ")}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-slate-500">Health Score</p>
            <p className="text-2xl font-semibold">{client.healthScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-slate-500">Active Services</p>
            <p className="text-2xl font-semibold">{activeServices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-slate-500">Total Invoiced</p>
            <p className="text-2xl font-semibold">{money(totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-slate-500">Outstanding</p>
            <p className="text-2xl font-semibold text-red-600">{money(outstanding)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Team & Contacts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <p>Sales owner: {client.salesOwner?.name ?? "—"}</p>
            <p>Account manager: {client.accountManager?.name ?? "—"}</p>
            <p>
              GST: <EditableField patchUrl={patchUrl} field="gstNumber" value={client.gstNumber ?? ""} canEdit={canEdit} />
            </p>
            <p>
              PAN: <EditableField patchUrl={patchUrl} field="panNumber" value={client.panNumber ?? ""} canEdit={canEdit} />
            </p>
            <div className="mt-2">
              {client.contacts.length === 0 && <p className="text-slate-400">No contacts added.</p>}
              {client.contacts.map((c) => (
                <div key={c.id} className="border-t border-slate-50 py-1">
                  {c.name} {c.isPrimary && <Badge tone="info">Primary</Badge>} — {c.email ?? "no email"}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.addresses.length === 0 && <p className="text-slate-400">No addresses added.</p>}
            {client.addresses.map((a) => (
              <div key={a.id} className="border-b border-slate-50 pb-2">
                <span className="font-medium">{a.type.replaceAll("_", " ")}</span>: {a.line1}, {a.city}, {a.state}{" "}
                {a.postalCode}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services & Renewals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.serviceOrders.length === 0 && <p className="text-slate-400">No services purchased yet.</p>}
            {client.serviceOrders.map((so) => (
              <div key={so.id} className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span>{so.service.name}</span>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{so.status.replaceAll("_", " ")}</Badge>
                  {so.renewalDate && <span className="text-xs text-slate-400">renews {new Date(so.renewalDate).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotations & Contracts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.quotations.map((q) => (
              <div key={q.id} className="flex justify-between border-b border-slate-50 pb-1">
                <span>{q.quotationNumber}</span>
                <Badge tone="neutral">{q.status}</Badge>
              </div>
            ))}
            {client.contracts.map((c) => (
              <div key={c.id} className="flex justify-between border-b border-slate-50 pb-1">
                <span>{c.contractNumber}</span>
                <Badge tone="neutral">{c.status}</Badge>
              </div>
            ))}
            {client.quotations.length === 0 && client.contracts.length === 0 && (
              <p className="text-slate-400">No quotations or contracts yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.projects.length === 0 && <p className="text-slate-400">No projects yet.</p>}
            {client.projects.map((p) => (
              <div key={p.id} className="flex justify-between border-b border-slate-50 pb-1">
                <span>{p.name}</span>
                <Badge tone="neutral">{p.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices & Payments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.invoices.map((inv) => (
              <div key={inv.id} className="flex justify-between border-b border-slate-50 pb-1">
                <span>
                  {inv.invoiceNumber} — {money(Number(inv.grandTotal))}
                </span>
                <Badge tone="neutral">{inv.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
            {client.invoices.length === 0 && <p className="text-slate-400">No invoices yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Tickets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.tickets.length === 0 && <p className="text-slate-400">No tickets raised.</p>}
            {client.tickets.map((t) => (
              <div key={t.id} className="flex justify-between border-b border-slate-50 pb-1">
                <span>{t.subject}</span>
                <Badge tone={t.status === "OPEN" ? "warning" : "neutral"}>{t.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.appointments.length === 0 && <p className="text-slate-400">No appointments scheduled.</p>}
            {client.appointments.map((a) => (
              <div key={a.id} className="flex justify-between border-b border-slate-50 pb-1">
                <span>{a.title}</span>
                <span className="text-xs text-slate-400">{new Date(a.startTime).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
          {client.notes.length === 0 && <p className="text-slate-400">No notes yet.</p>}
          {client.notes.map((n) => (
            <div key={n.id} className="border-b border-slate-50 pb-2">
              {n.content}
              <span className="ml-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <DocumentList entityType="Client" entityId={client.id} />
      <ActivityTimeline entityType="Client" entityId={client.id} />

    </div>
  );
}
