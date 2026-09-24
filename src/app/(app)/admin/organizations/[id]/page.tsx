import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateEmployeeDialog } from "@/components/team/create-employee-dialog";
import { CreateClientLoginDialog } from "@/components/team/create-client-login-dialog";
import { UserStatusToggle } from "@/components/team/user-status-toggle";
import { OrgApprovalPanel } from "@/components/admin/org-approval-panel";
import { PendingCredentialsList } from "@/components/admin/pending-credentials-list";

export default async function AdminOrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: organizationId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isPlatformAdmin) redirect("/dashboard");

  const [organization, employees, clientContacts, clients] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.user.findMany({
      where: { organizationId, roles: { some: { role: { systemRole: { not: "CLIENT" } } } } },
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.clientContact.findMany({
      where: { client: { organizationId }, userId: { not: null } },
      include: { client: { select: { name: true, companyName: true } }, user: { select: { id: true, email: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ where: { organizationId }, select: { id: true, name: true, companyName: true }, orderBy: { name: "asc" } }),
  ]);
  if (!organization) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/organizations" className="text-xs text-slate-500 hover:underline">
          &larr; All Organizations
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">{organization.name}</h1>
        <p className="text-sm text-slate-500">{organization.slug}</p>
      </div>

      <PendingCredentialsList organizationId={organization.id} />

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-slate-900">Admin Approval</h2>
        <OrgApprovalPanel
          organizationId={organization.id}
          adminsCanManageUsers={organization.adminsCanManageUsers}
          adminAssignableRoles={organization.adminAssignableRoles}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Employees</h2>
          <CreateEmployeeDialog organizationId={organization.id} />
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2 text-slate-600">{u.roles.map((r) => r.role.systemRole ?? r.role.name).join(", ")}</td>
                  <td className="px-4 py-2">
                    <Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <UserStatusToggle userId={u.id} status={u.status} />
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No employee logins yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Client Logins</h2>
          <CreateClientLoginDialog clients={clients} organizationId={organization.id} />
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {clientContacts.map((c) => (
                <tr key={c.id} className="border-b border-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{c.client.companyName ?? c.client.name}</td>
                  <td className="px-4 py-2 text-slate-600">{c.name}</td>
                  <td className="px-4 py-2 text-slate-600">{c.user?.email}</td>
                  <td className="px-4 py-2">
                    {c.user && <Badge tone={c.user.status === "ACTIVE" ? "success" : "danger"}>{c.user.status}</Badge>}
                  </td>
                  <td className="px-4 py-2">{c.user && <UserStatusToggle userId={c.user.id} status={c.user.status} />}</td>
                </tr>
              ))}
              {clientContacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No client logins yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
