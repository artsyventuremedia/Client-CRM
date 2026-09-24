import { z } from "zod";

export const contractStatusValues = [
  "DRAFT",
  "SENT",
  "UNDER_REVIEW",
  "ACTIVE",
  "EXPIRING",
  "EXPIRED",
  "RENEWED",
  "TERMINATED",
] as const;

export const createContractSchema = z.object({
  clientId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  contractValue: z.coerce.number().nonnegative(),
  paymentTerms: z.string().max(2000).optional(),
  renewalTerms: z.string().max(2000).optional(),
  slaTerms: z.string().max(2000).optional(),
});

export const updateContractSchema = createContractSchema.partial().extend({
  status: z.enum(contractStatusValues).optional(),
});
