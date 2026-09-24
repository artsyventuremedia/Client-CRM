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
  PENDING: "neutral",
  PROCESSING: "info",
  SUCCESS: "success",
  FAILED: "danger",
  REFUNDED: "warning",
};

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "payments", "VIEW")) redirect("/dashboard");

  const payment = await prisma.payment.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
    },
  });
  if (!payment) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "payments", "EDIT");
  const patchUrl = `/api/payments/${payment.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{currency.format(Number(payment.amount))}</h1>
          <p className="text-sm text-slate-500">Payment from {payment.client.name}</p>
        </div>
        <Badge tone={STATUS_TONE[payment.status] ?? "neutral"}>{payment.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
          <p>
            Client:{" "}
            <Link href={`/clients/${payment.client.id}`} className="underline hover:text-slate-900">
              {payment.client.name}
            </Link>
            {payment.client.companyName ? ` (${payment.client.companyName})` : ""}
          </p>
          <p>
            Invoice:{" "}
            {payment.invoice ? (
              <Link href={`/invoices/${payment.invoice.id}`} className="underline hover:text-slate-900">
                {payment.invoice.invoiceNumber}
              </Link>
            ) : (
              "—"
            )}
          </p>
          <p>Method: {payment.method.replaceAll("_", " ")}</p>
          <p>
            Transaction ID:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="transactionId"
              value={payment.transactionId ?? ""}
              canEdit={canEdit}
            />
          </p>
          <p>
            Notes:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="notes"
              type="textarea"
              value={payment.notes ?? ""}
              canEdit={canEdit}
            />
          </p>
          <p>Paid at: {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "—"}</p>
        </CardContent>
      </Card>
      <DocumentList entityType="Payment" entityId={payment.id} />
      <ActivityTimeline entityType="Payment" entityId={payment.id} />

    </div>
  );
}
