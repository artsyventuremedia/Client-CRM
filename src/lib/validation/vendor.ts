import { z } from "zod";

export const vendorStatusValues = ["ACTIVE", "INACTIVE", "BLACKLISTED", "PENDING_APPROVAL"] as const;

export const createVendorSchema = z.object({
  companyName: z.string().min(1).max(200),
  skills: z.string().optional(),
  location: z.string().max(200).optional(),
  paymentTerms: z.string().max(200).optional(),
  gstNumber: z.string().max(50).optional(),
  panNumber: z.string().max(50).optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional(),
});

export const updateVendorSchema = createVendorSchema.partial().extend({
  status: z.enum(vendorStatusValues).optional(),
});
