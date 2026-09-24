import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export async function ClientDashboard({ clientId }: { clientId: string }) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      projects: { orderBy: { createdAt: "desc" }, take: 5 },
      invoices: { orderBy: { createdAt: "desc" }, take: 5 },
      tickets: { orderBy: { createdAt: "desc" }, take: 5 },
      quotations: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!client) notFound();

  const now = new Date();
  const [kickoffDocument, currentContentSheet] = await Promise.all([
    prisma.kickoffDocument.findFirst({
      where: { clientId, sharedAt: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contentSheet.findUnique({
      where: { clientId_month_year: { clientId, month: now.getMonth() + 1, year: now.getFullYear() } },
      include: { _count: { select: { items: true } } },
    }),
  ]);

  const outstanding = client.invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) - Number(inv.amountPaid)), 0);
  const openTickets = client.tickets.filter((t) => !["RESOLVED", "CLOSED"].includes(t.status)).length;
  const activeProjects = client.projects.filter((p) => p.status === "IN_PROGRESS").length;

  const tiles = [
    { label: "Active Projects", value: String(activeProjects) },
    { label: "Open Tickets", value: String(openTickets) },
    { label: "Pending Quotations", value: String(client.quotations.filter((q) => q.status === "SENT" || q.status === "VIEWED").length) },
    { label: "Outstanding Amount", value: formatCurrency(outstanding) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {client.name}</h1>
        <p className="text-sm text-slate-500">Here&apos;s where things stand with your account.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kickoff Document</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {kickoffDocument ? (
              <Link href={`/clients/${clientId}/kickoff`} className="text-slate-900 underline">
                View &quot;{kickoffDocument.title}&quot;
              </Link>
            ) : (
              <p className="text-slate-400">Not shared yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Month&apos;s Content Sheet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {currentContentSheet ? (
              <Link href={`/clients/${clientId}/content-sheets/${currentContentSheet.id}`} className="text-slate-900 underline">
                {MONTH_NAMES[currentContentSheet.month - 1]} {currentContentSheet.year} ({currentContentSheet._count.items} items)
              </Link>
            ) : (
              <p className="text-slate-400">No content sheet for this month yet.</p>
            )}
            <Link href={`/clients/${clientId}/content-sheets`} className="mt-1 block text-xs text-slate-500 underline">
              View all content sheets
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.projects.length === 0 && <p className="text-slate-400">No projects yet.</p>}
            {client.projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded border border-slate-100 p-2">
                <span className="font-medium text-slate-800">{p.name}</span>
                <Badge tone="info">{p.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.invoices.length === 0 && <p className="text-slate-400">No invoices yet.</p>}
            {client.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded border border-slate-100 p-2">
                <span className="font-medium text-slate-800">{inv.invoiceNumber}</span>
                <span className="text-xs text-slate-500">{formatCurrency(Number(inv.grandTotal))}</span>
                <Badge tone="neutral">{inv.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Tickets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.tickets.length === 0 && <p className="text-slate-400">No support tickets.</p>}
            {client.tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded border border-slate-100 p-2">
                <span className="font-medium text-slate-800">{t.subject}</span>
                <Badge tone="warning">{t.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {client.quotations.length === 0 && <p className="text-slate-400">No quotations yet.</p>}
            {client.quotations.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded border border-slate-100 p-2">
                <span className="font-medium text-slate-800">{q.quotationNumber}</span>
                <Badge tone="neutral">{q.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
