import { z } from "zod";

export const createContentSheetSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const contentItemStatusValues = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "POSTED"] as const;

export const createContentSheetItemSchema = z.object({
  date: z.coerce.date().optional(),
  platform: z.string().max(60).optional(),
  contentType: z.string().max(60).optional(),
  caption: z.string().max(4000).optional(),
  status: z.enum(contentItemStatusValues).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateContentSheetItemSchema = createContentSheetItemSchema.partial();
