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
  DRAFT: "neutral",
  SENT: "info",
  VIEWED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "neutral",
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "invoices", "VIEW")) redirect("/dashboard");

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: {
      items: true,
      client: { select: { id: true, name: true, companyName: true } },
    },
  });
  if (!invoice) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "invoices", "EDIT");
  const patchUrl = `/api/invoices/${invoice.id}`;

  const outstanding = Number(invoice.grandTotal) - Number(invoice.amountPaid);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-slate-500">
            {invoice.client ? (
              <Link href={`/clients/${invoice.client.id}`} className="underline hover:text-slate-900">
                {invoice.client.companyName ?? invoice.client.name}
              </Link>
            ) : (
              "No client linked"
            )}
          </p>
        </div>
        <Badge tone={STATUS_TONE[invoice.status] ?? "neutral"}>{invoice.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-x-auto">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Unit Price</th>
                  <th className="px-4 py-2 font-medium">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 text-slate-800">{item.description}</td>
                    <td className="px-4 py-2 text-slate-600">{Number(item.quantity)}</td>
                    <td className="px-4 py-2 text-slate-600">{CURRENCY_FORMATTER.format(Number(item.unitPrice))}</td>
                    <td className="px-4 py-2 text-slate-600">{CURRENCY_FORMATTER.format(Number(item.lineTotal))}</td>
                  </tr>
                ))}
                {invoice.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No line items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <p>Subtotal: {CURRENCY_FORMATTER.format(Number(invoice.subtotal))}</p>
            <p>Discount: {CURRENCY_FORMATTER.format(Number(invoice.discountTotal))}</p>
            <p>Tax: {CURRENCY_FORMATTER.format(Number(invoice.taxTotal))}</p>
            <p className="font-semibold text-slate-900">Grand Total: {CURRENCY_FORMATTER.format(Number(invoice.grandTotal))}</p>
            <p>Amount Paid: {CURRENCY_FORMATTER.format(Number(invoice.amountPaid))}</p>
            <p className="font-semibold text-slate-900">Outstanding: {CURRENCY_FORMATTER.format(outstanding)}</p>
            <hr className="my-2 border-slate-100" />
            <p>Issue date: {new Date(invoice.issueDate).toLocaleDateString()}</p>
            <p>
              Due date:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="dueDate"
                type="date"
                value={invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : ""}
                displayValue={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : undefined}
                canEdit={canEdit}
              />
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Terms & Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
          <p>
            Payment terms:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="paymentTerms"
              value={invoice.paymentTerms ?? ""}
              canEdit={canEdit}
            />
          </p>
          <p>
            Notes:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="notes"
              type="textarea"
              value={invoice.notes ?? ""}
              canEdit={canEdit}
            />
          </p>
        </CardContent>
      </Card>
      <DocumentList entityType="Invoice" entityId={invoice.id} />
      <ActivityTimeline entityType="Invoice" entityId={invoice.id} />

    </div>
  );
}
