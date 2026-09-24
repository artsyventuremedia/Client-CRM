import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/check";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.organizationId;
  if (!organizationId) redirect("/dashboard");
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "settings", "EDIT")) {
    redirect("/dashboard");
  }

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Organization Settings</h1>
        <p className="text-sm text-slate-500">Manage your organization&apos;s profile, branding, and document numbering.</p>
      </div>

      <OrganizationSettingsForm organization={organization} />
    </div>
  );
}
