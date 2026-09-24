import { z } from "zod";

export const taskStatusValues = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "CLIENT_REVIEW",
  "COMPLETED",
  "CANCELLED",
] as const;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.coerce.date().optional(),
  estimatedHours: z.coerce.number().nonnegative().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(taskStatusValues).optional(),
});
