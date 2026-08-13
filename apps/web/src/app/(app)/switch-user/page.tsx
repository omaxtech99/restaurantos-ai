'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AuthSessionResponse, StaffMember } from '@restaurantos/types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Skeleton,
} from '@restaurantos/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { apiRequest, useAuthStore } from '@/lib/api';

const ROLE_LABEL: Record<string, string> = {
  waiter: 'Waiter',
  kitchen: 'Kitchen',
};

export default function SwitchUserPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    if (hasHydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hasHydrated, accessToken, router]);

  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiRequest<StaffMember[]>('/staff', { auth: true }),
    enabled: Boolean(accessToken),
  });

  const [activeStaff, setActiveStaff] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState('');

  const pinLogin = useMutation({
    mutationFn: (userId: string) =>
      apiRequest<AuthSessionResponse>('/auth/pin-login', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ userId, pin }),
      }),
    onSuccess: (session) => {
      setSession(session);
      setPin('');
      setActiveStaff(null);
      const roles = session.user.roles;
      if (roles.includes('kitchen')) router.push('/kitchen');
      else if (roles.includes('waiter')) router.push('/waiter');
      else router.push('/app');
    },
  });

  if (!hasHydrated || !accessToken) {
    return null;
  }

  const staff = staffQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_40%),hsl(var(--background))]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-8">
        <div>
          <Link
            href="/app"
            className="font-display text-2xl font-semibold tracking-tight hover:underline"
          >
            RestaurantOS
          </Link>
          <p className="text-sm text-muted-foreground">Switch user — hand off this device</p>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-6 pb-16">
        {staffQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : staff.length === 0 ? (
          <EmptyState
            title="No staff accounts yet"
            description="Ask the owner to add a waiter or kitchen PIN login from the Staff page."
          />
        ) : (
          staff.map((member) => (
            <Card key={member.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    {member.firstName} {member.lastName}
                  </CardTitle>
                  <div className="mt-1 flex gap-1.5">
                    {member.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {ROLE_LABEL[role] ?? role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setActiveStaff(member);
                    setPin('');
                  }}
                >
                  Switch
                </Button>
              </CardHeader>
            </Card>
          ))
        )}
      </main>

      <Dialog
        open={activeStaff !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveStaff(null);
            setPin('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeStaff?.firstName} {activeStaff?.lastName}
            </DialogTitle>
            <DialogDescription>Enter their 4-digit PIN to switch this device to them.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="switch-pin">PIN</Label>
              <Input
                id="switch-pin"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-2xl tracking-[0.5em]"
              />
            </div>
            {pinLogin.isError ? (
              <p className="text-sm text-destructive">
                {pinLogin.error instanceof Error ? pinLogin.error.message : 'Invalid PIN'}
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={pin.length !== 4 || pinLogin.isPending}
              onClick={() => activeStaff && pinLogin.mutate(activeStaff.id)}
            >
              {pinLogin.isPending ? 'Switching…' : 'Switch'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
