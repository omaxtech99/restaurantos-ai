import { z } from 'zod';

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url(),
  LANDING_URL: z.string().url().optional(),
  API_URL: z.string().url(),
  CORS_ORIGINS: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  SMTP_URL: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  R2_BUCKET: optionalString,
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_PUBLIC_URL: optionalString,
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const notificationEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NOTIFICATION_PORT: z.coerce.number().int().positive().default(4001),
  REDIS_URL: z.string().min(1),
  SMTP_URL: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  DATABASE_URL: z.string().min(1).optional(),
  WHATSAPP_ACCESS_TOKEN: optionalString,
  WHATSAPP_PHONE_NUMBER_ID: optionalString,
  WHATSAPP_TEMPLATE_NAME: optionalString,
  WHATSAPP_TEMPLATE_LANGUAGE: optionalString,
  WHATSAPP_GRAPH_VERSION: optionalString,
});

export type NotificationEnv = z.infer<typeof notificationEnvSchema>;

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function parseEnv<Schema extends z.ZodTypeAny>(
  schema: Schema,
  env: NodeJS.ProcessEnv = process.env,
): z.output<Schema> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
