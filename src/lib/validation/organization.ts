import { z } from "zod";

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  logoUrl: z.string().url().optional().or(z.literal("")),
  brandColor: z.string().max(20).optional(),
  gstNumber: z.string().max(30).optional(),
  panNumber: z.string().max(30).optional(),
  currency: z.string().min(1).max(10),
  timezone: z.string().min(1).max(60),
  invoicePrefix: z.string().min(1).max(20),
  quotationPrefix: z.string().min(1).max(20),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
