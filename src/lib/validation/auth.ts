import { z } from "zod";
import { strongPassword } from "./password";

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: strongPassword,
});
