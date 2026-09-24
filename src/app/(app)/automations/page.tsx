import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/check";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateAutomationDialog } from "@/components/automations/create-automation-dialog";
import { RuleActiveToggle } from "@/components/automations/rule-active-toggle";

export default async function AutomationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.organizationId;
  if (!organizationId) redirect("/dashboard");
  if (!session.user.isPlatformAdmin && !can(session.user.permissions, "automations", "VIEW")) redirect("/dashboard");

  const [rules, users] = await Promise.all([
    prisma.automationRule.findMany({
      where: { organizationId },
      include: { actions: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Automation Rules</h1>
          <p className="text-sm text-slate-500">
            Automatically assign, notify, or create follow-up tasks when a lead or ticket is created.
          </p>
        </div>
        <CreateAutomationDialog users={users} />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Trigger</th>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">{rule.name}</td>
                <td className="px-4 py-2 text-slate-600">{rule.triggerEvent}</td>
                <td className="px-4 py-2 text-slate-600">{rule.actions.map((a) => a.actionType).join(", ")}</td>
                <td className="px-4 py-2">
                  <Badge tone={rule.isActive ? "success" : "neutral"}>{rule.isActive ? "Active" : "Disabled"}</Badge>
                </td>
                <td className="px-4 py-2">
                  <RuleActiveToggle ruleId={rule.id} isActive={rule.isActive} />
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No automation rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
