import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { CreateOrgDialog } from "@/components/admin/create-org-dialog";

export default async function AdminOrganizationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isPlatformAdmin) redirect("/dashboard");

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, clients: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Organizations</h1>
          <p className="text-sm text-slate-500">Every organization on the platform. Create a new one to issue its owner login.</p>
        </div>
        <CreateOrgDialog />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Users</th>
              <th className="px-4 py-2 font-medium">Clients</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">
                  <Link href={`/admin/organizations/${org.id}`} className="hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{org.slug}</td>
                <td className="px-4 py-2 text-slate-600">{org._count.users}</td>
                <td className="px-4 py-2 text-slate-600">{org._count.clients}</td>
                <td className="px-4 py-2 text-slate-600">{new Date(org.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {organizations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No organizations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
