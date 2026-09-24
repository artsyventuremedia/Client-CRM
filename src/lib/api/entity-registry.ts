import { prisma } from "@/lib/prisma";
import type { Resource } from "@/lib/rbac/matrix";

export const ENTITY_DOCUMENT_CATEGORY: Record<string, string> = {
  Lead: "OTHER",
  Client: "CLIENT_DOCUMENT",
  Quotation: "QUOTATION",
  Contract: "CONTRACT",
  Service: "OTHER",
  Project: "PROJECT_DOCUMENT",
  Task: "PROJECT_DOCUMENT",
  Vendor: "OTHER",
  Invoice: "INVOICE",
  Payment: "OTHER",
  Ticket: "OTHER",
  Appointment: "OTHER",
  ContentSheet: "OTHER",
};

export const ENTITY_RESOURCE: Record<string, Resource> = {
  Lead: "leads",
  Client: "clients",
  Quotation: "quotations",
  Contract: "contracts",
  Service: "services",
  Project: "projects",
  Task: "tasks",
  Vendor: "vendors",
  Invoice: "invoices",
  Payment: "payments",
  Ticket: "tickets",
  Appointment: "appointments",
  ContentSheet: "content_sheets",
};

/** URL path prefix for an entity's detail page, e.g. Ticket -> /tickets/{id}. */
export const ENTITY_ROUTE: Record<string, string> = {
  Lead: "leads",
  Client: "clients",
  Quotation: "quotations",
  Contract: "contracts",
  Service: "services",
  Project: "projects",
  Task: "tasks",
  Vendor: "vendors",
  Invoice: "invoices",
  Payment: "payments",
  Ticket: "tickets",
  Appointment: "appointments",
};

const ENTITY_MODEL: Record<string, keyof typeof prisma> = {
  Lead: "lead",
  Client: "client",
  Quotation: "quotation",
  Contract: "contract",
  Service: "service",
  Project: "project",
  Task: "task",
  Vendor: "vendor",
  Invoice: "invoice",
  Payment: "payment",
  Ticket: "ticket",
  Appointment: "appointment",
  ContentSheet: "contentSheet",
};

/** Confirms the entity exists and belongs to the given organization. */
export async function entityBelongsToOrg(entityType: string, entityId: string, organizationId: string): Promise<boolean> {
  const modelKey = ENTITY_MODEL[entityType];
  if (!modelKey) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = prisma[modelKey] as any;
  const record = await model.findFirst({ where: { id: entityId, organizationId }, select: { id: true } });
  return Boolean(record);
}

/** Looks up a "notify this person about new activity" user id for an entity, e.g. its assignee/owner. */
export async function getEntityOwnerId(entityType: string, entityId: string): Promise<string | null> {
  switch (entityType) {
    case "Lead":
      return (await prisma.lead.findUnique({ where: { id: entityId }, select: { assignedToId: true } }))?.assignedToId ?? null;
    case "Task":
      return (await prisma.task.findUnique({ where: { id: entityId }, select: { assigneeId: true } }))?.assigneeId ?? null;
    case "Ticket":
      return (await prisma.ticket.findUnique({ where: { id: entityId }, select: { assigneeId: true } }))?.assigneeId ?? null;
    case "Client":
      return (await prisma.client.findUnique({ where: { id: entityId }, select: { accountManagerId: true } }))?.accountManagerId ?? null;
    case "Project": {
      const project = await prisma.project.findUnique({ where: { id: entityId }, select: { managerId: true } });
      return project?.managerId ?? null;
    }
    default:
      return null;
  }
}

/** Looks up the clientId a given entity belongs to, for client-portal row scoping. Returns undefined if the entity type has no client concept. */
export async function getEntityClientId(entityType: string, entityId: string): Promise<string | null | undefined> {
  switch (entityType) {
    case "Client":
      return entityId;
    case "Quotation":
      return (await prisma.quotation.findUnique({ where: { id: entityId }, select: { clientId: true } }))?.clientId ?? null;
    case "Contract":
      return (await prisma.contract.findUnique({ where: { id: entityId }, select: { clientId: true } }))?.clientId ?? null;
    case "Project":
      return (await prisma.project.findUnique({ where: { id: entityId }, select: { clientId: true } }))?.clientId ?? null;
    case "Task":
      return (await prisma.task.findUnique({ where: { id: entityId }, select: { clientId: true } }))?.clientId ?? null;
    case "Invoice":
      return (await prisma.invoice.findUnique({ where: { id: entityId }, select: { clientId: true } }))?.clientId ?? null;
    case "Payment":
      return (await prisma.payment.findUnique({ where: { id: entityId }, select: { clientId: true } }))?.clientId ?? null;
    case "Ticket":
      return (await prisma.ticket.findUnique({ where: { id: entityId }, select: { clientId: true } }))?.clientId ?? null;
    case "Appointment":
      return (await prisma.appointment.findUnique({ where: { id: entityId }, select: { clientId: true } }))?.clientId ?? null;
    case "ContentSheet":
      return (await prisma.contentSheet.findUnique({ where: { id: entityId }, select: { clientId: true } }))?.clientId ?? null;
    default:
      return undefined;
  }
}
