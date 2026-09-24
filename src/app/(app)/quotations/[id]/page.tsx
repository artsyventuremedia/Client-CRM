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
  DRAFT: "info",
  SENT: "info",
  VIEWED: "info",
  NEGOTIATION: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  EXPIRED: "danger",
  CONVERTED: "success",
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "quotations", "VIEW")) redirect("/dashboard");

  const quotation = await prisma.quotation.findFirst({
    where: { id, organizationId },
    include: {
      items: true,
      client: { select: { id: true, name: true, companyName: true } },
    },
  });
  if (!quotation) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "quotations", "EDIT");
  const patchUrl = `/api/quotations/${quotation.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{quotation.quotationNumber}</h1>
          <p className="text-sm text-slate-500">
            {quotation.client ? (
              <Link href={`/clients/${quotation.client.id}`} className="underline hover:text-slate-900">
                {quotation.client.companyName ?? quotation.client.name}
              </Link>
            ) : (
              "No client linked"
            )}
          </p>
        </div>
        <Badge tone={STATUS_TONE[quotation.status] ?? "neutral"}>{quotation.status}</Badge>
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
                {quotation.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 text-slate-800">{item.description}</td>
                    <td className="px-4 py-2 text-slate-600">{Number(item.quantity)}</td>
                    <td className="px-4 py-2 text-slate-600">{CURRENCY_FORMATTER.format(Number(item.unitPrice))}</td>
                    <td className="px-4 py-2 text-slate-600">{CURRENCY_FORMATTER.format(Number(item.lineTotal))}</td>
                  </tr>
                ))}
                {quotation.items.length === 0 && (
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
            <p>Subtotal: {CURRENCY_FORMATTER.format(Number(quotation.subtotal))}</p>
            <p>Discount: {CURRENCY_FORMATTER.format(Number(quotation.discountTotal))}</p>
            <p>Tax: {CURRENCY_FORMATTER.format(Number(quotation.taxTotal))}</p>
            <p className="font-semibold text-slate-900">Grand Total: {CURRENCY_FORMATTER.format(Number(quotation.grandTotal))}</p>
            <hr className="my-2 border-slate-100" />
            <p>Quotation date: {new Date(quotation.quotationDate).toLocaleDateString()}</p>
            <p>
              Expiry date:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="expiryDate"
                type="date"
                value={quotation.expiryDate ? quotation.expiryDate.toISOString().slice(0, 10) : ""}
                displayValue={quotation.expiryDate ? new Date(quotation.expiryDate).toLocaleDateString() : undefined}
                canEdit={canEdit}
              />
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Terms & Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
          <p>
            Terms:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="terms"
              type="textarea"
              value={quotation.terms ?? ""}
              canEdit={canEdit}
            />
          </p>
          <p>
            Payment terms:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="paymentTerms"
              value={quotation.paymentTerms ?? ""}
              canEdit={canEdit}
            />
          </p>
          <p>
            Notes:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="notes"
              type="textarea"
              value={quotation.notes ?? ""}
              canEdit={canEdit}
            />
          </p>
        </CardContent>
      </Card>
      <DocumentList entityType="Quotation" entityId={quotation.id} />
      <ActivityTimeline entityType="Quotation" entityId={quotation.id} />

    </div>
  );
}
