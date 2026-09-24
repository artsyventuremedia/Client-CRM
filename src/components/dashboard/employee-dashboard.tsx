import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function EmployeeDashboard({ userId, organizationId }: { userId: string; organizationId: string }) {
  const [myLeads, myTasks, myTickets, myFollowups] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId, assignedToId: userId, status: { notIn: ["WON", "LOST"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: { organizationId, assigneeId: userId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.ticket.findMany({
      where: { organizationId, assigneeId: userId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.leadFollowup.findMany({
      where: { ownerId: userId, status: "PENDING" },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { lead: { select: { name: true } } },
    }),
  ]);

  const tiles = [
    { label: "My Open Leads", value: myLeads.length },
    { label: "My Pending Tasks", value: myTasks.length },
    { label: "My Open Tickets", value: myTickets.length },
    { label: "My Upcoming Follow-ups", value: myFollowups.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">My Dashboard</h1>
        <p className="text-sm text-slate-500">Work assigned to you.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="border-b-0 pb-0">
              <CardTitle className="text-xs font-medium text-slate-500">{tile.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-2xl font-semibold text-slate-900">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Leads</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {myLeads.length === 0 && <p className="text-slate-400">No leads assigned to you.</p>}
            {myLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between rounded border border-slate-100 p-2 hover:bg-slate-50">
                <span className="font-medium text-slate-800">{lead.name}</span>
                <Badge tone="info">{lead.status.replaceAll("_", " ")}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {myTasks.length === 0 && <p className="text-slate-400">No pending tasks.</p>}
            {myTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded border border-slate-100 p-2">
                <span className="font-medium text-slate-800">{task.title}</span>
                <span className="text-xs text-slate-400">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Tickets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {myTickets.length === 0 && <p className="text-slate-400">No open tickets.</p>}
            {myTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between rounded border border-slate-100 p-2">
                <span className="font-medium text-slate-800">{ticket.subject}</span>
                <Badge tone="warning">{ticket.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-slate-600">
            {myFollowups.length === 0 && <p className="text-slate-400">No follow-ups scheduled.</p>}
            {myFollowups.map((f) => (
              <div key={f.id} className="rounded border border-slate-100 p-2">
                <p className="font-medium text-slate-800">{f.purpose}</p>
                <p className="text-xs text-slate-400">
                  {f.lead?.name} · {new Date(f.scheduledAt).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
