import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CreateLeadDialog } from "@/components/leads/create-lead-dialog";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  NEW: "info",
  CONTACTED: "info",
  QUALIFIED: "warning",
  REQUIREMENT_IDENTIFIED: "warning",
  PROPOSAL_SENT: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "danger",
};

export default async function LeadsPage() {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!organizationId) return null;

  const leads = await prisma.lead.findMany({
    where: { organizationId },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">Track prospects from first contact through conversion.</p>
        </div>
        <CreateLeadDialog />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Est. Value</th>
              <th className="px-4 py-2 font-medium">Assigned To</th>
              <th className="px-4 py-2 font-medium">Next Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:underline">
                    {lead.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{lead.company ?? "—"}</td>
                <td className="px-4 py-2">
                  <Badge tone={STATUS_TONE[lead.status] ?? "neutral"}>{lead.status.replaceAll("_", " ")}</Badge>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {lead.estimatedValue
                    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
                        Number(lead.estimatedValue),
                      )
                    : "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">{lead.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {lead.nextFollowupAt ? new Date(lead.nextFollowupAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No leads yet. Create your first lead to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
