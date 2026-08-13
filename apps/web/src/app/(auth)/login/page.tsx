'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { loginSchema } from '@restaurantos/shared';
import type { AuthSessionResponse } from '@restaurantos/types';
import { z } from 'zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@restaurantos/ui';
import { apiRequest, useAuthStore } from '@/lib/api';

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      tenantSlug: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: LoginForm) =>
      apiRequest<AuthSessionResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          tenantSlug: values.tenantSlug || undefined,
        }),
      }),
    onSuccess: (session) => {
      setSession(session);
      router.push('/app');
    },
  });

  return (
    <Card className="w-full max-w-md animate-fade-in border-border/70 bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your RestaurantOS workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenantSlug">Workspace slug (optional)</Label>
            <Input id="tenantSlug" {...form.register('tenantSlug')} />
          </div>
          {mutation.isError ? (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : 'Unable to sign in'}
            </p>
          ) : null}
          <Button className="w-full" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/forgot-password" className="hover:text-foreground">
            Forgot password
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            Create account
          </Link>
        </div>
        <div className="mt-3 text-center text-sm text-muted-foreground">
          <Link href="/staff-login" className="hover:text-foreground">
            Staff? Sign in with your PIN instead
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
