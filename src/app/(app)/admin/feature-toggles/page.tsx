import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RESOURCES } from "@/lib/rbac/matrix";
import { toggleableSystemRoles } from "@/lib/validation/admin";
import { FeatureToggleGrid } from "@/components/admin/feature-toggle-grid";

export default async function FeatureTogglesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isPlatformAdmin) redirect("/dashboard");

  const toggles = await prisma.roleFeatureToggle.findMany();
  const disabledSet = new Set(toggles.filter((t) => !t.enabled).map((t) => `${t.systemRole}:${t.resource}`));

  const grid = toggleableSystemRoles.map((systemRole) => ({
    systemRole,
    resources: RESOURCES.map((resource) => ({
      resource,
      enabled: !disabledSet.has(`${systemRole}:${resource}`),
    })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Feature Toggles</h1>
        <p className="text-sm text-slate-500">
          Enable or disable whole feature areas per role, platform-wide. Unchecking a box hides that section&apos;s nav item and
          blocks its API for every login holding that role.
        </p>
      </div>
      <FeatureToggleGrid initialGrid={grid} />
    </div>
  );
}
