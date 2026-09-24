import { z } from "zod";

export const projectStatusValues = [
  "PLANNING",
  "NOT_STARTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "REVIEW",
  "COMPLETED",
  "CANCELLED",
] as const;

export const projectPriorityValues = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const createProjectSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  managerId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
  budget: z.coerce.number().nonnegative().optional(),
  priority: z.enum(projectPriorityValues).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(projectStatusValues).optional(),
});
