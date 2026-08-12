'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { resetPasswordSchema } from '@restaurantos/shared';
import { z } from 'zod';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from '@restaurantos/ui';
import { apiRequest } from '@/lib/api';

type ResetForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetForm) =>
      apiRequest<{ success: true }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
  });

  return (
    <Card className="w-full max-w-md animate-fade-in border-border/70 bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Use a strong password with mixed case and numbers.</CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Your password has been updated.</p>
            <Link href="/login" className="text-sm hover:underline">
              Continue to sign in
            </Link>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <input type="hidden" {...form.register('token')} />
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            {mutation.isError ? (
              <p className="text-sm text-destructive">
                {mutation.error instanceof Error ? mutation.error.message : 'Unable to reset password'}
              </p>
            ) : null}
            <Button className="w-full" type="submit" disabled={mutation.isPending || !token}>
              {mutation.isPending ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full max-w-md" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
