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
  ACTIVE: "success",
  INACTIVE: "neutral",
  BLACKLISTED: "danger",
  PENDING_APPROVAL: "warning",
};

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "vendors", "VIEW")) redirect("/dashboard");

  const vendor = await prisma.vendor.findFirst({
    where: { id, organizationId },
    include: { contacts: true },
  });
  if (!vendor) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "vendors", "EDIT");
  const patchUrl = `/api/vendors/${vendor.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            <EditableField patchUrl={patchUrl} field="companyName" value={vendor.companyName} canEdit={canEdit} />
          </h1>
          <p className="text-sm text-slate-500">
            <EditableField
              patchUrl={patchUrl}
              field="location"
              value={vendor.location ?? ""}
              displayValue={vendor.location ?? "No location on file"}
              canEdit={canEdit}
            />
          </p>
        </div>
        <Badge tone={STATUS_TONE[vendor.status] ?? "neutral"}>{vendor.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            <p>
              Location: <EditableField patchUrl={patchUrl} field="location" value={vendor.location ?? ""} canEdit={canEdit} />
            </p>
            <p>
              Payment terms:{" "}
              <EditableField patchUrl={patchUrl} field="paymentTerms" value={vendor.paymentTerms ?? ""} canEdit={canEdit} />
            </p>
            <p>
              GST number:{" "}
              <EditableField patchUrl={patchUrl} field="gstNumber" value={vendor.gstNumber ?? ""} canEdit={canEdit} />
            </p>
            <p>
              PAN number:{" "}
              <EditableField patchUrl={patchUrl} field="panNumber" value={vendor.panNumber ?? ""} canEdit={canEdit} />
            </p>
            <p>Rating: {vendor.rating ? Number(vendor.rating).toFixed(2) : "—"}</p>
            <p>Skills: {vendor.skills.length > 0 ? vendor.skills.join(", ") : "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {vendor.contacts.length === 0 && <p className="text-slate-400">No contacts on file.</p>}
            {vendor.contacts.map((contact) => (
              <div key={contact.id} className="rounded border border-slate-100 p-2">
                <p className="font-medium text-slate-800">
                  {contact.name}
                  {contact.isPrimary && (
                    <Badge tone="info" className="ml-2">
                      Primary
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {contact.email ?? "—"} · {contact.phone ?? "—"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <DocumentList entityType="Vendor" entityId={vendor.id} />
      <ActivityTimeline entityType="Vendor" entityId={vendor.id} />

    </div>
  );
}
