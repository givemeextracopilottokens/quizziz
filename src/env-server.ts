import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
});

export const env = serverEnvSchema.parse(process.env);
