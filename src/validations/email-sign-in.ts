import { z } from "zod";

export const emailSignInSchema = z.object({
  email: z.string().trim().email().max(254),
});

export type EmailSignInInput = z.infer<typeof emailSignInSchema>;
