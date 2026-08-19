import { z } from "zod";

/**
 * Strict schema for the contact form payload.
 *
 * - `.trim()` removes leading/trailing whitespace.
 * - `.strict()` on the object rejects any unexpected extra fields
 *   (e.g. an "to" or "recipient" field a malicious client might try to inject).
 */
export const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name must be at most 100 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Invalid email address")
      .max(254, "Email is too long"),
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(5000, "Message must be at most 5000 characters"),
  })
  .strict();

export type ContactInput = z.infer<typeof contactSchema>;
