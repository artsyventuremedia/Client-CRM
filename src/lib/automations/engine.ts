import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// Only event-driven triggers are supported (fired synchronously from the mutation that creates the record).
// Time-based triggers (e.g. "task overdue") would require a scheduler/cron worker, which this app doesn't have.
export const TRIGGER_EVENTS = ["lead.created", "ticket.created"] as const;
export const ACTION_TYPES = ["assign_round_robin", "notify_user", "create_task"] as const;

export type TriggerEvent = (typeof TRIGGER_EVENTS)[number];
export type ActionType = (typeof ACTION_TYPES)[number];

interface TriggerRecord {
  id: string;
  clientId?: string | null;
  [key: string]: unknown;
}

function matchesConditions(conditions: unknown, record: TriggerRecord): boolean {
  if (!conditions || typeof conditions !== "object") return true;
  for (const [key, expected] of Object.entries(conditions as Record<string, unknown>)) {
    if (record[key] !== expected) return false;
  }
  return true;
}

async function pickRoundRobinAssignee(organizationId: string, userIds: string[], resource: "lead" | "task" | "ticket"): Promise<string | null> {
  if (userIds.length === 0) return null;
  if (userIds.length === 1) return userIds[0];

  const counts = await Promise.all(
    userIds.map(async (userId) => {
      const count =
        resource === "lead"
          ? await prisma.lead.count({ where: { organizationId, assignedToId: userId, status: { notIn: ["WON", "LOST"] } } })
          : resource === "task"
            ? await prisma.task.count({ where: { organizationId, assigneeId: userId, status: { notIn: ["COMPLETED", "CANCELLED"] } } })
            : await prisma.ticket.count({ where: { organizationId, assigneeId: userId, status: { notIn: ["RESOLVED", "CLOSED"] } } });
      return { userId, count };
    }),
  );
  counts.sort((a, b) => a.count - b.count);
  return counts[0].userId;
}

async function executeAction(
  actionType: string,
  actionConfig: unknown,
  organizationId: string,
  entityType: "Lead" | "Task" | "Ticket" | "Invoice",
  record: TriggerRecord,
) {
  const config = (actionConfig ?? {}) as Record<string, unknown>;

  if (actionType === "notify_user" && typeof config.userId === "string") {
    await notify({
      organizationId,
      userId: config.userId,
      event: "automation.notify",
      title: typeof config.title === "string" ? config.title : "Automation triggered",
      body: typeof record.name === "string" ? record.name : typeof record.title === "string" ? record.title : record.id,
      data: { url: `/${entityType.toLowerCase()}s/${record.id}` },
    });
    return;
  }

  if (actionType === "assign_round_robin" && Array.isArray(config.userIds)) {
    const userIds = config.userIds.filter((u): u is string => typeof u === "string");
    const resource = entityType === "Lead" ? "lead" : entityType === "Task" ? "task" : entityType === "Ticket" ? "ticket" : null;
    if (!resource) return;
    const assigneeId = await pickRoundRobinAssignee(organizationId, userIds, resource);
    if (!assigneeId) return;
    if (entityType === "Lead") await prisma.lead.update({ where: { id: record.id }, data: { assignedToId: assigneeId } });
    if (entityType === "Task") await prisma.task.update({ where: { id: record.id }, data: { assigneeId } });
    if (entityType === "Ticket") await prisma.ticket.update({ where: { id: record.id }, data: { assigneeId } });
    await notify({
      organizationId,
      userId: assigneeId,
      event: "automation.assigned",
      title: `New ${entityType.toLowerCase()} assigned to you`,
      body: typeof record.name === "string" ? record.name : typeof record.title === "string" ? record.title : typeof record.subject === "string" ? record.subject : record.id,
      data: { url: `/${entityType.toLowerCase()}s/${record.id}` },
    });
    return;
  }

  if (actionType === "create_task" && typeof config.title === "string") {
    await prisma.task.create({
      data: {
        organizationId,
        title: config.title,
        clientId: record.clientId ?? null,
        assigneeId: typeof config.assigneeId === "string" ? config.assigneeId : null,
      },
    });
  }
}

export async function runAutomations(
  organizationId: string,
  triggerEvent: TriggerEvent,
  entityType: "Lead" | "Task" | "Ticket" | "Invoice",
  record: TriggerRecord,
) {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { organizationId, triggerEvent, isActive: true },
      include: { actions: { orderBy: { order: "asc" } } },
    });
    for (const rule of rules) {
      if (!matchesConditions(rule.conditions, record)) continue;
      for (const action of rule.actions) {
        await executeAction(action.actionType, action.actionConfig, organizationId, entityType, record);
      }
    }
  } catch (error) {
    console.error("runAutomations() failed", error);
  }
}
