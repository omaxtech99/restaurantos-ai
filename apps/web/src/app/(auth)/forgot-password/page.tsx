'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { forgotPasswordSchema } from '@restaurantos/shared';
import { z } from 'zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@restaurantos/ui';
import { apiRequest } from '@/lib/api';

type ForgotForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const form = useForm<ForgotForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '', tenantSlug: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotForm) =>
      apiRequest<{ accepted: true }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: values.email,
          tenantSlug: values.tenantSlug || undefined,
        }),
      }),
  });

  return (
    <Card className="w-full max-w-md animate-fade-in border-border/70 bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Enter your email and we will send reset instructions if an account exists.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If an account exists for that email, reset instructions have been queued.
            </p>
            <Link href="/login" className="text-sm hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Workspace slug (optional)</Label>
              <Input id="tenantSlug" {...form.register('tenantSlug')} />
            </div>
            <Button className="w-full" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
