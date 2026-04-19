import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { lastLoginMethod } from 'better-auth/plugins';

import { db } from '~/db';
import * as schema from '~/db/schema';
import { env as clientEnv } from '~/env-client';
import { env as serverEnv } from '~/env-server';

export const auth = betterAuth({
  appName: 'Quizziz',
  plugins: [tanstackStartCookies(), lastLoginMethod()],

  database: drizzleAdapter(db, { provider: 'pg', schema }),
  baseURL: clientEnv.VITE_APP_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      display: 'popup',
      clientId: clientEnv.VITE_GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    },

    github: {
      clientId: clientEnv.VITE_GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
    },
  },
});
