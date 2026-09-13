import { z } from "zod";
import { strongPassword } from "./password";

export const registerOrgSchema = z.object({
  organizationName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: strongPassword,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: strongPassword,
});
