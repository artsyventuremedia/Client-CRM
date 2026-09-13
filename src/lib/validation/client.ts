import { z } from "zod";

export const clientCategoryValues = [
  "INDIVIDUAL",
  "BUSINESS",
  "ENTERPRISE",
  "GOVERNMENT",
  "NGO",
  "EDUCATIONAL_INSTITUTION",
  "OTHER",
] as const;

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  companyName: z.string().max(200).optional(),
  category: z.enum(clientCategoryValues).optional(),
  industry: z.string().max(100).optional(),
  gstNumber: z.string().max(30).optional(),
  panNumber: z.string().max(30).optional(),
  salesOwnerId: z.string().optional(),
  accountManagerId: z.string().optional(),
  leadId: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "AT_RISK", "RENEWAL_RISK", "PAYMENT_RISK", "CHURNED"]).optional(),
});
