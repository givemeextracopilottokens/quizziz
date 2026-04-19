import { z } from 'zod';

const clientEnvSchema = z.object({
  VITE_APP_URL: z.url(),
  VITE_GOOGLE_CLIENT_ID: z.string(),
  VITE_GITHUB_CLIENT_ID: z.string(),
});

export const env = clientEnvSchema.parse(import.meta.env);
