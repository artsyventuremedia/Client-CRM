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
  UNDER_REVIEW: "info",
  ACTIVE: "success",
  EXPIRING: "warning",
  EXPIRED: "danger",
  RENEWED: "success",
  TERMINATED: "danger",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "contracts", "VIEW")) redirect("/dashboard");

  const contract = await prisma.contract.findFirst({
    where: { id, organizationId },
    include: { client: { select: { id: true, name: true, companyName: true } } },
  });
  if (!contract) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "contracts", "EDIT");
  const patchUrl = `/api/contracts/${contract.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{contract.contractNumber}</h1>
          <p className="text-sm text-slate-500">
            <Link href={`/clients/${contract.client.id}`} className="underline hover:text-slate-900">
              {contract.client.name}
              {contract.client.companyName ? ` (${contract.client.companyName})` : ""}
            </Link>
          </p>
        </div>
        <Badge tone={STATUS_TONE[contract.status] ?? "neutral"}>{contract.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
          <p>Start date: {new Date(contract.startDate).toLocaleDateString()}</p>
          <p>
            End date:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="endDate"
              type="date"
              value={contract.endDate ? contract.endDate.toISOString().slice(0, 10) : ""}
              displayValue={contract.endDate ? new Date(contract.endDate).toLocaleDateString() : undefined}
              canEdit={canEdit}
            />
          </p>
          <p>
            Contract value:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="contractValue"
              type="number"
              value={String(contract.contractValue)}
              displayValue={currencyFormatter.format(Number(contract.contractValue))}
              canEdit={canEdit}
            />
          </p>
          <p>
            Payment terms:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="paymentTerms"
              type="textarea"
              value={contract.paymentTerms ?? ""}
              canEdit={canEdit}
            />
          </p>
          <p>
            Renewal terms:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="renewalTerms"
              type="textarea"
              value={contract.renewalTerms ?? ""}
              canEdit={canEdit}
            />
          </p>
          <p>
            SLA terms:{" "}
            <EditableField
              patchUrl={patchUrl}
              field="slaTerms"
              type="textarea"
              value={contract.slaTerms ?? ""}
              canEdit={canEdit}
            />
          </p>
        </CardContent>
      </Card>
      <DocumentList entityType="Contract" entityId={contract.id} />
      <ActivityTimeline entityType="Contract" entityId={contract.id} />

    </div>
  );
}
