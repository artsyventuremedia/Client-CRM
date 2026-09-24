import { z } from "zod";

export const createKickoffSchema = z.object({
  title: z.string().min(1).max(200),
  goals: z.string().max(4000).optional(),
  scope: z.string().max(4000).optional(),
  timeline: z.string().max(2000).optional(),
  targetAudience: z.string().max(2000).optional(),
  brandGuidelines: z.string().max(4000).optional(),
  keyContacts: z.string().max(2000).optional(),
  notes: z.string().max(4000).optional(),
});

export const updateKickoffSchema = createKickoffSchema.partial().extend({
  share: z.boolean().optional(),
});
