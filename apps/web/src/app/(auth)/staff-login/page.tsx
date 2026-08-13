'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AuthSessionResponse, StaffLoginOptionsResponse } from '@restaurantos/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
} from '@restaurantos/ui';
import { ApiClientError, apiRequest, useAuthStore } from '@/lib/api';

const ROLE_LABEL: Record<string, string> = {
  waiter: 'Waiter',
  kitchen: 'Kitchen',
};

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);

  const codeFromUrl = searchParams.get('code') ?? '';
  const [tenantSlug, setTenantSlug] = useState(codeFromUrl);
  const [submittedSlug, setSubmittedSlug] = useState(codeFromUrl);
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const [pin, setPin] = useState('');

  const optionsQuery = useQuery({
    queryKey: ['staff-login-options', submittedSlug],
    queryFn: () =>
      apiRequest<StaffLoginOptionsResponse>(`/auth/staff-login/${encodeURIComponent(submittedSlug)}`),
    enabled: submittedSlug.length > 0,
    retry: false,
  });

  const staffLogin = useMutation({
    mutationFn: (userId: string) =>
      apiRequest<AuthSessionResponse>('/auth/staff-login', {
        method: 'POST',
        body: JSON.stringify({ tenantSlug: submittedSlug, userId, pin }),
      }),
    onSuccess: (session) => {
      setSession(session);
      setPin('');
      setActiveStaffId(null);
      const roles = session.user.roles;
      if (roles.includes('kitchen')) router.push('/kitchen');
      else if (roles.includes('waiter')) router.push('/waiter');
      else router.push('/app');
    },
  });

  const staff = optionsQuery.data?.staff ?? [];
  const activeStaff = staff.find((member) => member.id === activeStaffId) ?? null;

  return (
    <>
      <Card className="w-full max-w-md animate-fade-in border-border/70 bg-card/90 backdrop-blur">
        <CardHeader>
          <CardTitle>Staff sign in</CardTitle>
          <CardDescription>
            Enter your restaurant&apos;s code to find your name, then your 4-digit PIN — no email
            or password needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedSlug(tenantSlug.trim());
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="tenant-slug">Restaurant code</Label>
              <Input
                id="tenant-slug"
                placeholder="your-restaurant"
                value={tenantSlug}
                onChange={(event) => setTenantSlug(event.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={tenantSlug.trim().length === 0}>
              Find
            </Button>
          </form>

          {submittedSlug ? (
            optionsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : optionsQuery.isError ? (
              <p className="text-sm text-destructive">
                {optionsQuery.error instanceof ApiClientError
                  ? optionsQuery.error.message
                  : 'Restaurant not found — check the code and try again'}
              </p>
            ) : staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No staff PIN logins have been set up for {optionsQuery.data?.tenantName} yet. Ask
                your manager to add one from the Staff page.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{optionsQuery.data?.tenantName}</p>
                {staff.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <div className="mt-1 flex gap-1.5">
                        {member.roles.map((role) => (
                          <Badge key={role} variant="secondary">
                            {ROLE_LABEL[role] ?? role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveStaffId(member.id);
                        setPin('');
                      }}
                    >
                      Sign in
                    </Button>
                  </div>
                ))}
              </div>
            )
          ) : null}

          <div className="pt-2 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Sign in with email instead
            </Link>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={activeStaff !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveStaffId(null);
            setPin('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeStaff?.firstName} {activeStaff?.lastName}
            </DialogTitle>
            <DialogDescription>Enter your 4-digit PIN to sign in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-login-pin">PIN</Label>
              <Input
                id="staff-login-pin"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-2xl tracking-[0.5em]"
              />
            </div>
            {staffLogin.isError ? (
              <p className="text-sm text-destructive">
                {staffLogin.error instanceof Error ? staffLogin.error.message : 'Invalid PIN'}
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={pin.length !== 4 || staffLogin.isPending}
              onClick={() => activeStaff && staffLogin.mutate(activeStaff.id)}
            >
              {staffLogin.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-md" />}>
      <StaffLoginForm />
    </Suspense>
  );
}
