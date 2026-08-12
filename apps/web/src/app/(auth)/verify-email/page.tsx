'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@restaurantos/ui';
import { apiRequest } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ success: true }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
  });

  useEffect(() => {
    if (!token) {
      return;
    }
    mutation.mutate();
  }, [token]);

  return (
    <Card className="w-full max-w-md animate-fade-in border-border/70 bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle>Email verification</CardTitle>
        <CardDescription>Confirming your RestaurantOS account email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!token ? <p className="text-sm text-destructive">Missing verification token.</p> : null}
        {mutation.isPending ? <p className="text-sm text-muted-foreground">Verifying…</p> : null}
        {mutation.isSuccess ? (
          <p className="text-sm text-muted-foreground">Your email has been verified.</p>
        ) : null}
        {mutation.isError ? (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : 'Verification failed'}
          </p>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-md" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
