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

  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASSWORD: z.string().min(1, "SMTP_PASSWORD is required"),
  SMTP_FROM: z.string().min(1, "SMTP_FROM is required"),

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

  smtp: {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    password: parsed.data.SMTP_PASSWORD,
    from: parsed.data.SMTP_FROM,
  },

  contactEmail: parsed.data.CONTACT_EMAIL,
  frontendUrl: parsed.data.FRONTEND_URL,
};
