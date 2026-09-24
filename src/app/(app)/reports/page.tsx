import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/check";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

async function getReportsData(organizationId: string) {
  const [leadFunnel, invoiceAgg, ticketStatus, projectStatus] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], where: { organizationId }, _count: true }),
    prisma.invoice.aggregate({ where: { organizationId }, _sum: { grandTotal: true, amountPaid: true } }),
    prisma.ticket.groupBy({ by: ["status"], where: { organizationId }, _count: true }),
    prisma.project.groupBy({ by: ["status"], where: { organizationId }, _count: true }),
  ]);

  const totalInvoiced = Number(invoiceAgg._sum.grandTotal ?? 0);
  const totalCollected = Number(invoiceAgg._sum.amountPaid ?? 0);

  return {
    leadFunnel,
    ticketStatus,
    projectStatus,
    revenue: {
      totalInvoiced,
      totalCollected,
      outstanding: totalInvoiced - totalCollected,
    },
  };
}

function StatusCountTable({ rows }: { rows: Array<{ status: string; _count: number }> }) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate-400">No data yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
        <tr>
          <th className="px-4 py-2 font-medium">Status</th>
          <th className="px-4 py-2 font-medium">Count</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.status} className="border-b border-slate-50">
            <td className="px-4 py-2 text-slate-600">{row.status}</td>
            <td className="px-4 py-2 font-medium text-slate-900">{row._count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.organizationId;
  if (!organizationId) redirect("/dashboard");
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "reports", "VIEW")) {
    redirect("/dashboard");
  }

  const { leadFunnel, ticketStatus, projectStatus, revenue } = await getReportsData(organizationId);

  const revenueTiles: Array<{ label: string; value: string }> = [
    { label: "Total Invoiced", value: formatCurrency(revenue.totalInvoiced) },
    { label: "Total Collected", value: formatCurrency(revenue.totalCollected) },
    { label: "Outstanding", value: formatCurrency(revenue.outstanding) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">
          An analytics snapshot of your organization&apos;s sales funnel, revenue, tickets, and project status.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-slate-900">Revenue</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {revenueTiles.map((tile) => (
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Sales Funnel</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatusCountTable rows={leadFunnel.map((r) => ({ status: r.status, _count: r._count }))} />
          </CardContent>
        </Card>

        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Ticket Health</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatusCountTable rows={ticketStatus.map((r) => ({ status: r.status, _count: r._count }))} />
          </CardContent>
        </Card>

        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <StatusCountTable rows={projectStatus.map((r) => ({ status: r.status, _count: r._count }))} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
