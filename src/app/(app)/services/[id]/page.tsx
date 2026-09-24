import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { DocumentList } from "@/components/documents/document-list";
import { EditableField } from "@/components/detail/editable-field";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "services", "VIEW")) redirect("/dashboard");

  const service = await prisma.service.findFirst({
    where: { id, organizationId },
    include: { category: { select: { name: true } } },
  });
  if (!service) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "services", "EDIT");
  const patchUrl = `/api/services/${service.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            <EditableField patchUrl={patchUrl} field="name" value={service.name} canEdit={canEdit} />
          </h1>
          <p className="text-sm text-slate-500">{service.category?.name ?? "Uncategorized"}</p>
        </div>
        <Badge tone={service.isActive ? "success" : "neutral"}>{service.isActive ? "Active" : "Inactive"}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <p>
              Description:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="description"
                type="textarea"
                value={service.description ?? ""}
                canEdit={canEdit}
              />
            </p>
            <p>Pricing model: {service.pricingModel.replaceAll("_", " ")}</p>
            <p>Renewal cycle: {service.renewalCycle.replaceAll("_", " ")}</p>
            <p>
              Tax rate:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="taxRatePercent"
                type="number"
                value={service.taxRatePercent ? String(service.taxRatePercent) : ""}
                displayValue={`${Number(service.taxRatePercent)}%`}
                canEdit={canEdit}
              />
            </p>
            <p>Default discount: {Number(service.defaultDiscountPercent)}%</p>
            <p>SLA days: {service.slaDays ?? "—"}</p>
            <p>Duration days: {service.durationDays ?? "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <p>
              One-time:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="oneTimePrice"
                type="number"
                value={service.oneTimePrice ? String(service.oneTimePrice) : ""}
                displayValue={service.oneTimePrice ? currency.format(Number(service.oneTimePrice)) : undefined}
                canEdit={canEdit}
              />
            </p>
            <p>
              Monthly:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="monthlyPrice"
                type="number"
                value={service.monthlyPrice ? String(service.monthlyPrice) : ""}
                displayValue={service.monthlyPrice ? currency.format(Number(service.monthlyPrice)) : undefined}
                canEdit={canEdit}
              />
            </p>
            <p>Quarterly: {service.quarterlyPrice ? currency.format(Number(service.quarterlyPrice)) : "—"}</p>
            <p>Half-yearly: {service.halfYearlyPrice ? currency.format(Number(service.halfYearlyPrice)) : "—"}</p>
            <p>
              Annual:{" "}
              <EditableField
                patchUrl={patchUrl}
                field="annualPrice"
                type="number"
                value={service.annualPrice ? String(service.annualPrice) : ""}
                displayValue={service.annualPrice ? currency.format(Number(service.annualPrice)) : undefined}
                canEdit={canEdit}
              />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {service.features.length === 0 && <p className="text-slate-400">No features listed.</p>}
            {service.features.length > 0 && (
              <ul className="list-disc pl-4">
                {service.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <DocumentList entityType="Service" entityId={service.id} />
      <ActivityTimeline entityType="Service" entityId={service.id} />

    </div>
  );
}
