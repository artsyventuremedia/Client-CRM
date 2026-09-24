import { z } from "zod";
import { RESOURCES } from "@/lib/rbac/matrix";

export const createSavedViewSchema = z.object({
  resource: z.enum(RESOURCES),
  name: z.string().min(1).max(80),
  params: z.record(z.string(), z.string()),
});
