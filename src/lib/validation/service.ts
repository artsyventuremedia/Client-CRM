import { z } from "zod";

export const pricingModelValues = ["ONE_TIME", "RECURRING", "SUBSCRIPTION", "RETAINER", "PROJECT_BASED"] as const;

export const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  categoryName: z.string().max(200).optional(),
  pricingModel: z.enum(pricingModelValues).optional(),
  oneTimePrice: z.coerce.number().nonnegative().optional(),
  monthlyPrice: z.coerce.number().nonnegative().optional(),
  quarterlyPrice: z.coerce.number().nonnegative().optional(),
  halfYearlyPrice: z.coerce.number().nonnegative().optional(),
  annualPrice: z.coerce.number().nonnegative().optional(),
  taxRatePercent: z.coerce.number().nonnegative().optional(),
  defaultDiscountPercent: z.coerce.number().nonnegative().optional(),
  slaDays: z.coerce.number().int().nonnegative().optional(),
  durationDays: z.coerce.number().int().nonnegative().optional(),
  renewalCycle: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL", "CUSTOM"]).optional(),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});
