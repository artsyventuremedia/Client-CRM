import { z } from "zod";

export const createCommentSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  content: z.string().min(1).max(4000),
});
