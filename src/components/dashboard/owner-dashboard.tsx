import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getOnboardingStatus(organizationId: string) {
  const [totalLeads, totalClients, teamSize, totalQuotations] = await Promise.all([
    prisma.lead.count({ where: { organizationId } }),
    prisma.client.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId } }),
    prisma.quotation.count({ where: { organizationId } }),
  ]);
  return { totalLeads, totalClients, teamSize, totalQuotations };
}

async function getKpis(organizationId: string) {
  const [
    totalClients,
    activeClients,
    newLeads,
    qualifiedLeads,
    activeServiceOrders,
    renewalsDue,
    activeProjects,
    pendingTasks,
    overdueTasks,
    openTickets,
    pendingQuotations,
    approvedQuotations,
    invoiceAgg,
    outstandingInvoices,
  ] = await Promise.all([
    prisma.client.count({ where: { organizationId } }),
    prisma.client.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.lead.count({ where: { organizationId, status: "NEW" } }),
    prisma.lead.count({ where: { organizationId, status: "QUALIFIED" } }),
    prisma.serviceOrder.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.serviceOrder.count({ where: { organizationId, status: "RENEWAL_DUE" } }),
    prisma.project.count({ where: { organizationId, status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { organizationId, status: { in: ["TODO", "IN_PROGRESS"] } } }),
    prisma.task.count({ where: { organizationId, dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.ticket.count({ where: { organizationId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.quotation.count({ where: { organizationId, status: { in: ["SENT", "VIEWED", "NEGOTIATION"] } } }),
    prisma.quotation.count({ where: { organizationId, status: "APPROVED" } }),
    prisma.invoice.aggregate({ where: { organizationId }, _sum: { grandTotal: true, amountPaid: true } }),
    prisma.invoice.count({ where: { organizationId, status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] } } }),
  ]);

  const totalInvoiced = Number(invoiceAgg._sum.grandTotal ?? 0);
  const totalReceived = Number(invoiceAgg._sum.amountPaid ?? 0);

  return {
    totalClients,
    activeClients,
    newLeads,
    qualifiedLeads,
    activeServiceOrders,
    renewalsDue,
    activeProjects,
    pendingTasks,
    overdueTasks,
    openTickets,
    pendingQuotations,
    approvedQuotations,
    totalInvoiced,
    totalReceived,
    outstanding: totalInvoiced - totalReceived,
    outstandingInvoices,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export async function OwnerDashboard({ organizationId }: { organizationId: string }) {
  const [kpis, onboarding] = await Promise.all([getKpis(organizationId), getOnboardingStatus(organizationId)]);

  const steps = [
    { label: "Add your first lead", done: onboarding.totalLeads > 0, href: "/leads" },
    { label: "Add or convert your first client", done: onboarding.totalClients > 0, href: "/clients" },
    { label: "Send your first quotation", done: onboarding.totalQuotations > 0, href: "/quotations" },
    { label: "Invite your team", done: onboarding.teamSize > 1, href: "/team" },
  ];
  const isNewOrg = !steps.every((s) => s.done);

  const tiles: Array<{ label: string; value: string; tone?: string }> = [
    { label: "Total Clients", value: String(kpis.totalClients) },
    { label: "Active Clients", value: String(kpis.activeClients) },
    { label: "New Leads", value: String(kpis.newLeads) },
    { label: "Qualified Leads", value: String(kpis.qualifiedLeads) },
    { label: "Active Services", value: String(kpis.activeServiceOrders) },
    { label: "Renewals Due", value: String(kpis.renewalsDue) },
    { label: "Active Projects", value: String(kpis.activeProjects) },
    { label: "Pending Tasks", value: String(kpis.pendingTasks) },
    { label: "Overdue Tasks", value: String(kpis.overdueTasks) },
    { label: "Open Tickets", value: String(kpis.openTickets) },
    { label: "Pending Quotations", value: String(kpis.pendingQuotations) },
    { label: "Approved Quotations", value: String(kpis.approvedQuotations) },
    { label: "Total Invoiced", value: formatCurrency(kpis.totalInvoiced) },
    { label: "Total Received", value: formatCurrency(kpis.totalReceived) },
    { label: "Outstanding Payments", value: formatCurrency(kpis.outstanding) },
    { label: "Unpaid Invoices", value: String(kpis.outstandingInvoices) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Organization Dashboard</h1>
        <p className="text-sm text-slate-500">A 360-degree snapshot of your business today.</p>
      </div>

      {isNewOrg && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {steps.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className="flex items-center gap-3 rounded-md border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
              >
                <span
                  className={
                    step.done
                      ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700"
                      : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-400"
                  }
                >
                  {step.done ? "✓" : ""}
                </span>
                <span className={step.done ? "text-slate-400 line-through" : "text-slate-700"}>{step.label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="border-b-0 pb-0">
              <CardTitle className="text-xs font-medium text-slate-500">{tile.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-2xl font-semibold text-slate-900">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
