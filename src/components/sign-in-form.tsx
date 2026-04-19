import { useState, type ComponentProps } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { IconBrandGithub, IconBrandGoogleFilled } from '@tabler/icons-react';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import { Badge } from '~/components/ui/badge';
import { authClient } from '~/lib/auth-client';
import { cn } from '~/lib/utils';

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(50),
});

type SignInError = {
  email?: { message: string }[];
  password?: { message: string }[];
};

function SignInProvider({
  children,
  provider,
  className,
  ...props
}: ComponentProps<typeof Button> & { provider: string }) {
  const lastUsed = authClient.isLastUsedLoginMethod(provider);

  return (
    <Button
      variant="outline"
      size="lg"
      type="button"
      autoFocus={lastUsed}
      className={cn('relative', className)}
      {...props}
    >
      {children}

      {lastUsed ? (
        <Badge
          variant="outline"
          className="absolute -top-2 -right-2 bg-primary"
        >
          Last used
        </Badge>
      ) : null}
    </Button>
  );
}

export function SignInForm({
  callbackURL,
  ...props
}: ComponentProps<'form'> & {
  callbackURL: string;
}) {
  const navigate = useNavigate();

  const [isPending, setIsPending] = useState(false);
  const [errors, setErrors] = useState<SignInError>({});

  const signIn = async (formData: FormData): Promise<SignInError> => {
    const validatedFields = signInSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!validatedFields.success) {
      return validatedFields.error.flatten(({ message }) => ({ message }))
        .fieldErrors;
    }

    const { email, password } = validatedFields.data;

    const response = await authClient.signIn.email({
      email,
      password,
    });

    if (response.data) {
      await navigate({ to: callbackURL, replace: true });
    }

    const message = response.error?.message;

    return message ? { email: [{ message }], password: [{ message }] } : {};
  };

  const signInWithProvider = async (provider: string) => {
    const response = await authClient.signIn.social({ provider, callbackURL });

    if (response.data) {
      await navigate({ to: callbackURL, replace: true });
    }

    console.error(response.error);
  };

  return (
    <form
      onSubmit={async event => {
        event.preventDefault();

        setIsPending(true);

        const formData = new FormData(event.target);
        const errors = await signIn(formData);

        setErrors(errors);
        setIsPending(false);
      }}
      {...props}
    >
      <FieldGroup>
        <Field>
          <SignInProvider
            provider="google"
            onClick={() => signInWithProvider('google')}
          >
            <IconBrandGoogleFilled />
            Continue with Google
          </SignInProvider>
          <SignInProvider
            provider="github"
            onClick={() => signInWithProvider('github')}
          >
            <IconBrandGithub />
            Continue with Github
          </SignInProvider>
        </Field>
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
          Or continue with
        </FieldSeparator>
        <Field data-invalid={errors.email && errors.email.length > 0}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="m@example.com"
            aria-invalid={errors.email && errors.email.length > 0}
          />
          {errors.email?.length ? <FieldError errors={errors.email} /> : null}
        </Field>
        <Field data-invalid={errors.password && errors.password.length > 0}>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="●●●●●●●●"
            aria-invalid={errors.password && errors.password.length > 0}
          />
          {errors.password?.length ? (
            <FieldError errors={errors.password} />
          ) : null}
        </Field>
        <Field>
          <Button size="lg" type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner />
                Processing...
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <FieldDescription className="text-center">
            Don&apos;t have an account?{' '}
            <Link to="." search={prev => ({ ...prev, page: 'sign-up' })}>
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
