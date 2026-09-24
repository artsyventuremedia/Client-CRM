import { z } from "zod";

export const quotationStatusValues = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "NEGOTIATION",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
] as const;

export const createQuotationSchema = z.object({
  clientId: z.string(),
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  expiryDate: z.string().optional(),
  terms: z.string().max(2000).optional(),
  paymentTerms: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateQuotationSchema = z.object({
  clientId: z.string().optional(),
  expiryDate: z.string().optional(),
  terms: z.string().max(2000).optional(),
  paymentTerms: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(quotationStatusValues).optional(),
});
