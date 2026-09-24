import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/guard";
import type { Session } from "next-auth";

/**
 * Gate for non-Owner Admins creating Employee/Client logins: the Super Admin must have
 * explicitly approved this organization (`adminsCanManageUsers`), and if a role allow-list
 * is set, the requested role must be in it. Platform admins and the ORG_OWNER always pass.
 */
export async function requireAdminUserManagementApproval(session: Session, organizationId: string, systemRole: string) {
  if (session.user.isPlatformAdmin) return;
  if (session.user.systemRoles.includes("ORG_OWNER")) return;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { adminsCanManageUsers: true, adminAssignableRoles: true },
  });
  if (!org?.adminsCanManageUsers) {
    throw new ApiError(403, "Your organization's Admin permissions to create logins require Super Admin approval");
  }
  if (org.adminAssignableRoles.length > 0 && !org.adminAssignableRoles.includes(systemRole)) {
    throw new ApiError(403, `Your Super Admin has not approved you to create ${systemRole} logins`);
  }
}
