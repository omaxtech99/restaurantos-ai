'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { signupSchema } from '@restaurantos/shared';
import type { AuthSessionResponse } from '@restaurantos/types';
import { z } from 'zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@restaurantos/ui';
import { apiRequest, useAuthStore } from '@/lib/api';

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      tenantName: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: SignupForm) =>
      apiRequest<AuthSessionResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: (session) => {
      setSession(session);
      router.push('/app');
    },
  });

  return (
    <Card className="w-full max-w-lg animate-fade-in border-border/70 bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>Start your RestaurantOS foundation account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tenantName">Restaurant / company name</Label>
            <Input id="tenantName" {...form.register('tenantName')} />
            {form.formState.errors.tenantName ? (
              <p className="text-sm text-destructive">{form.formState.errors.tenantName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...form.register('firstName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...form.register('lastName')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          {mutation.isError ? (
            <p className="sm:col-span-2 text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : 'Unable to sign up'}
            </p>
          ) : null}
          <Button className="sm:col-span-2 w-full" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating workspace…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
