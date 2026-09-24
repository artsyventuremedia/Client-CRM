import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { ContentSheetTable } from "@/components/content-sheets/content-sheet-table";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { DocumentList } from "@/components/documents/document-list";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function ContentSheetDetailPage({ params }: { params: Promise<{ id: string; sheetId: string }> }) {
  const { id: clientId, sheetId } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "content_sheets", "VIEW")) redirect("/dashboard");
  if (session.user.clientId && session.user.clientId !== clientId) redirect("/dashboard");

  const sheet = await prisma.contentSheet.findFirst({
    where: { id: sheetId, clientId, organizationId },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      items: { orderBy: { date: "asc" }, include: { createdBy: { select: { name: true } } } },
    },
  });
  if (!sheet) notFound();

  const canEdit = session.user.isPlatformAdmin || can(session.user.permissions, "content_sheets", "EDIT");
  const canDelete = !session.user.clientId && (session.user.isPlatformAdmin || can(session.user.permissions, "content_sheets", "DELETE"));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/clients/${clientId}/content-sheets`} className="text-xs text-slate-500 hover:underline">
          &larr; Back to Content Sheets
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">
          {MONTH_NAMES[sheet.month - 1]} {sheet.year} — {sheet.client.companyName ?? sheet.client.name}
        </h1>
      </div>

      <ContentSheetTable
        sheetId={sheet.id}
        items={sheet.items.map((item) => ({
          ...item,
          date: item.date ? item.date.toISOString() : null,
          createdByName: item.createdBy?.name ?? null,
        }))}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <DocumentList entityType="ContentSheet" entityId={sheet.id} />
      <ActivityTimeline entityType="ContentSheet" entityId={sheet.id} />
    </div>
  );
}
