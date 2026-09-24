import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { CreateContentSheetDialog } from "@/components/content-sheets/create-content-sheet-dialog";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function ContentSheetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "content_sheets", "VIEW")) redirect("/dashboard");
  if (session.user.clientId && session.user.clientId !== clientId) redirect("/dashboard");

  const client = await prisma.client.findFirst({ where: { id: clientId, organizationId }, select: { id: true, name: true, companyName: true } });
  if (!client) notFound();

  const isClientPortal = Boolean(session.user.clientId);
  const canCreate = !isClientPortal && (session.user.isPlatformAdmin || can(session.user.permissions, "content_sheets", "CREATE"));

  const sheets = await prisma.contentSheet.findMany({
    where: { clientId, organizationId },
    include: { _count: { select: { items: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          {!isClientPortal && (
            <Link href={`/clients/${clientId}`} className="text-xs text-slate-500 hover:underline">
              &larr; Back to {client.companyName ?? client.name}
            </Link>
          )}
          <h1 className="text-xl font-semibold text-slate-900">Content Sheets</h1>
          <p className="text-sm text-slate-500">{client.companyName ?? client.name}</p>
        </div>
        {canCreate && <CreateContentSheetDialog clientId={clientId} />}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Month</th>
              <th className="px-4 py-2 font-medium">Items</th>
            </tr>
          </thead>
          <tbody>
            {sheets.map((sheet) => (
              <tr key={sheet.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/clients/${clientId}/content-sheets/${sheet.id}`} className="font-medium text-slate-900 hover:underline">
                    {MONTH_NAMES[sheet.month - 1]} {sheet.year}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{sheet._count.items}</td>
              </tr>
            ))}
            {sheets.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-400">
                  No content sheets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
