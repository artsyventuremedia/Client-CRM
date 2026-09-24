import { z } from "zod";

export const paymentMethodValues = ["ONLINE", "BANK_TRANSFER", "UPI", "CASH", "CHEQUE", "OTHER"] as const;

export const paymentStatusValues = ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"] as const;

export const createPaymentSchema = z.object({
  clientId: z.string(),
  invoiceId: z.string().optional(),
  amount: z.coerce.number().positive(),
  method: z.enum(paymentMethodValues),
  status: z.enum(paymentStatusValues).optional().default("SUCCESS"),
  transactionId: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const updatePaymentSchema = createPaymentSchema.partial();
