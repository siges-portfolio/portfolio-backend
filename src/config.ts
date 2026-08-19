import "dotenv/config";
import { z } from "zod";

/**
 * All environment variables are validated on startup.
 * If something required is missing or malformed, the process
 * fails fast with a clear error instead of failing later at
 * request time (e.g. when trying to send an email).
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),

  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM: z.string().min(1, "RESEND_FROM is required"),

  CONTACT_EMAIL: z.string().email("CONTACT_EMAIL must be a valid email"),

  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "Invalid environment configuration:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const config = {
  port: parsed.data.PORT,

  resend: {
    apiKey: parsed.data.RESEND_API_KEY,
    from: parsed.data.RESEND_FROM,
  },

  contactEmail: parsed.data.CONTACT_EMAIL,
  frontendUrl: parsed.data.FRONTEND_URL,
};
