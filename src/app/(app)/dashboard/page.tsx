import { auth } from "@/lib/auth";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";

const OWNER_TIER_ROLES = new Set(["ORG_OWNER", "ADMIN"]);

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.isPlatformAdmin) {
    return <SuperAdminDashboard />;
  }

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    return (
      <div className="text-sm text-slate-500">
        Your account isn&apos;t linked to an organization yet. Contact your administrator.
      </div>
    );
  }

  if (session.user.clientId) {
    return <ClientDashboard clientId={session.user.clientId} />;
  }

  const isOwnerTier = session.user.systemRoles.some((role) => OWNER_TIER_ROLES.has(role));
  if (isOwnerTier) {
    return <OwnerDashboard organizationId={organizationId} />;
  }

  return <EmployeeDashboard userId={session.user.id} organizationId={organizationId} />;
}
