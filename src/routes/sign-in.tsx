import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';
import { z } from 'zod';

import { SignInForm } from '~/components/sign-in-form';
import { SignUpForm } from '~/components/sign-up-form';
import { SkeletonBackground } from '~/components/skeleton-background';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { FieldDescription } from '~/components/ui/field';

const signInSearchSchema = z.object({
  page: z.enum(['sign-in', 'sign-up']).default('sign-in').catch('sign-in'),
  callbackURL: z.string().default('/').catch('/'),
});

export const Route = createFileRoute('/sign-in')({
  validateSearch: signInSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { page, callbackURL } = Route.useSearch();

  const [signUpName, setSignUpName] = useState('');

  return (
    <>
      <SkeletonBackground />

      <Dialog defaultOpen disablePointerDismissal>
        <DialogContent
          showCloseButton={false}
          initialFocus={false}
          className="overflow-hidden border-none bg-transparent p-0 shadow-none ring-0 duration-300"
        >
          <motion.div
            layout
            initial={false}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="flex flex-col gap-6 rounded-xl border border-foreground/10 bg-popover p-6"
          >
            <Link
              to="/"
              className="flex items-center gap-2 self-center text-base font-medium"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <img src="/images/icon.png" alt="" width={16} height={16} />
              </div>
              Quizziz
            </Link>

            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">
                {page === 'sign-in'
                  ? 'Welcome back'
                  : signUpName
                    ? `Welcome ${signUpName}`
                    : 'Create account'}
              </DialogTitle>
              <DialogDescription>
                {page === 'sign-in'
                  ? 'Sign in with your Github or Google account'
                  : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {page === 'sign-in' ? (
                    <SignInForm callbackURL={callbackURL} />
                  ) : (
                    <SignUpForm
                      setSignUpName={setSignUpName}
                      callbackURL={callbackURL}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <FieldDescription className="px-6 text-center">
              By clicking continue, you agree to our{' '}
              <a href="#">Terms of Service</a> and{' '}
              <a href="#">Privacy Policy</a>.
            </FieldDescription>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
