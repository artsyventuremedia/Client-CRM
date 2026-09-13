import { z } from "zod";

export const leadStatusValues = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "REQUIREMENT_IDENTIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const createLeadSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  source: z.string().max(100).optional(),
  requirement: z.string().max(2000).optional(),
  estimatedValue: z.coerce.number().nonnegative().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.enum(leadStatusValues).optional(),
});
