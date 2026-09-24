import { z } from "zod";

export const invoiceStatusValues = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export const createInvoiceSchema = z.object({
  clientId: z.string(),
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  dueDate: z.coerce.date().optional(),
  paymentTerms: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateInvoiceSchema = z.object({
  clientId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  paymentTerms: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(invoiceStatusValues).optional(),
  amountPaid: z.coerce.number().nonnegative().optional(),
});
