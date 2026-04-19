import {
  useEffect,
  useState,
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useDebouncedCallback } from 'use-debounce';
import { z } from 'zod';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import { authClient } from '~/lib/auth-client';

const signUpSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.email(),
  password: z.string().min(6).max(50),
});

type SignUpError = {
  firstName?: { message: string }[];
  lastName?: { message: string }[];
  email?: { message: string }[];
  password?: { message: string }[];
};

export function SignUpForm({
  setSignUpName,
  callbackURL,
  ...props
}: ComponentProps<'form'> & {
  setSignUpName: Dispatch<SetStateAction<string>>;
  callbackURL: string;
}) {
  const navigate = useNavigate();

  const [isPending, setIsPending] = useState(false);
  const [errors, setErrors] = useState<SignUpError>({});

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const setName = useDebouncedCallback((value: string) => {
    setSignUpName(value);
  }, 500);

  useEffect(() => {
    if (firstName.length < 3 || lastName.length < 3) {
      setName('');
      setName.flush();

      return;
    }

    setName(`${firstName} ${lastName}`);
  }, [firstName, lastName]);

  const signUp = async (formData: FormData): Promise<SignUpError> => {
    const validatedFields = signUpSchema.safeParse({
      firstName: formData.get('first-name'),
      lastName: formData.get('last-name'),
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!validatedFields.success) {
      return validatedFields.error.flatten(({ message }) => ({ message }))
        .fieldErrors;
    }

    const { email, password } = validatedFields.data;

    const response = await authClient.signUp.email({
      name: `${firstName} ${lastName}`,
      email,
      password,
    });

    if (response.data) {
      await navigate({ to: callbackURL, replace: true });
    }

    const message = response.error?.message;

    return message ? { email: [{ message }] } : {};
  };

  return (
    <form
      onSubmit={async event => {
        event.preventDefault();

        setIsPending(true);

        const formData = new FormData(event.target);
        const errors = await signUp(formData);

        setErrors(errors);
        setIsPending(false);
      }}
      {...props}
    >
      <FieldGroup>
        <Field data-invalid={errors.firstName && errors.firstName.length > 0}>
          <FieldLabel htmlFor="first-name">First name</FieldLabel>
          <Input
            id="first-name"
            name="first-name"
            type="text"
            required
            placeholder="John"
            autoFocus
            aria-invalid={errors.firstName && errors.firstName.length > 0}
            onChange={event => setFirstName(event.target.value)}
          />
          {errors.firstName?.length ? (
            <FieldError errors={errors.firstName} />
          ) : null}
        </Field>
        <Field data-invalid={errors.lastName && errors.lastName.length > 0}>
          <FieldLabel htmlFor="last-name">Last name</FieldLabel>
          <Input
            id="last-name"
            name="last-name"
            type="text"
            required
            placeholder="Doe"
            aria-invalid={errors.lastName && errors.lastName.length > 0}
            onChange={event => setLastName(event.target.value)}
          />
          {errors.lastName?.length ? (
            <FieldError errors={errors.lastName} />
          ) : null}
        </Field>
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
          <FieldLabel htmlFor="password">Password</FieldLabel>
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
              'Sign up'
            )}
          </Button>

          <FieldDescription className="text-center">
            Already have an account?{' '}
            <Link to="." search={prev => ({ ...prev, page: 'sign-in' })}>
              Sign in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
