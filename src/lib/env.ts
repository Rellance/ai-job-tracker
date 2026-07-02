import { z } from "zod";

/**
 * Server-side environment validation (System Design §13).
 * Core vars are required; integration vars are optional and become required
 * per milestone (Redis @ M1/M4, OpenAI @ M4, Stripe @ M5, R2 @ M4, Resend @ M1).
 * The app fails fast at boot if a required var is missing/invalid.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Core (required)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  AUTH_SECRET: z.string().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Integrations (feature-gated; required at their milestone)
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`❌ Invalid environment variables:\n${message}`);
}

export const env = parsed.data;
