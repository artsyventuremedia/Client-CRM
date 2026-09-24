import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac/check";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { KickoffEditor } from "@/components/kickoff/kickoff-editor";

export default async function KickoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "kickoff_documents", "VIEW")) redirect("/dashboard");
  if (session.user.clientId && session.user.clientId !== clientId) redirect("/dashboard");

  const client = await prisma.client.findFirst({ where: { id: clientId, organizationId }, select: { id: true, name: true, companyName: true } });
  if (!client) notFound();

  const isClientPortal = Boolean(session.user.clientId);
  const canEdit = !isClientPortal && (session.user.isPlatformAdmin || can(session.user.permissions, "kickoff_documents", "EDIT"));
  const canCreate = !isClientPortal && (session.user.isPlatformAdmin || can(session.user.permissions, "kickoff_documents", "CREATE"));

  const document = await prisma.kickoffDocument.findFirst({
    where: {
      clientId,
      organizationId,
      ...(isClientPortal ? { sharedAt: { not: null } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        {!isClientPortal && (
          <Link href={`/clients/${clientId}`} className="text-xs text-slate-500 hover:underline">
            &larr; Back to {client.companyName ?? client.name}
          </Link>
        )}
        <h1 className="text-xl font-semibold text-slate-900">Kickoff Document</h1>
        <p className="text-sm text-slate-500">{client.companyName ?? client.name}</p>
      </div>

      {!document && !canCreate && (
        <Card>
          <CardContent className="py-8 text-center text-slate-400">No kickoff document has been shared yet.</CardContent>
        </Card>
      )}

      {(document || canCreate) && (
        <KickoffEditor clientId={clientId} document={document} canEdit={canEdit} />
      )}
    </div>
  );
}
