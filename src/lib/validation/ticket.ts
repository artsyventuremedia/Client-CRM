import { z } from "zod";

export const ticketPriorityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const ticketStatusValues = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "WAITING_FOR_VENDOR",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
] as const;

export const createTicketSchema = z.object({
  clientId: z.string(),
  subject: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  category: z.string().max(100).optional(),
  priority: z.enum(ticketPriorityValues).optional(),
  assigneeId: z.string().optional(),
});

export const updateTicketSchema = createTicketSchema.partial().extend({
  status: z.enum(ticketStatusValues).optional(),
});
