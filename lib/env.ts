import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SITE_ID: z.string().min(1),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
});

const env = envSchema.parse({
  NEXT_PUBLIC_SITE_ID: process.env.NEXT_PUBLIC_SITE_ID,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
});

export default env;
