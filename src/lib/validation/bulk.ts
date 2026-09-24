import { z } from "zod";

export const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  action: z.enum(["updateStatus", "delete"]),
  value: z.string().optional(),
});
