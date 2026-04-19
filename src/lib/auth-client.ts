import { createAuthClient } from 'better-auth/react';
import { lastLoginMethodClient } from 'better-auth/client/plugins';

import { env } from '~/env-client';

export const authClient = createAuthClient({
  plugins: [lastLoginMethodClient()],

  baseURL: env.VITE_APP_URL,
});
