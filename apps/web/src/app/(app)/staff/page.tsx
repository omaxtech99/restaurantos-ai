'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStaffSchema } from '@restaurantos/shared';
import type { StaffMember } from '@restaurantos/types';
import { z } from 'zod';
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
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  Skeleton,
} from '@restaurantos/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { apiRequest, useAuthStore } from '@/lib/api';

type StaffForm = z.infer<typeof createStaffSchema>;

const ROLE_LABEL: Record<string, string> = {
  waiter: 'Waiter',
  kitchen: 'Kitchen',
};

export default function StaffPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const queryClient = useQueryClient();

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<StaffForm>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { firstName: '', lastName: '', role: 'waiter', pin: '' },
  });

  const createStaff = useMutation({
    mutationFn: (values: StaffForm) =>
      apiRequest('/staff', { method: 'POST', auth: true, body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      form.reset();
      setDialogOpen(false);
    },
  });

  const deleteStaff = useMutation({
    mutationFn: (staffId: string) => apiRequest(`/staff/${staffId}`, { method: 'DELETE', auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
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
          <p className="text-sm text-muted-foreground">Staff — waiter &amp; kitchen PIN logins</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add staff</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add staff member</DialogTitle>
                <DialogDescription>
                  They&apos;ll sign in on the shared device with just their name and this 4-digit
                  PIN — no email or password needed.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((values) => createStaff.mutate(values))}
              >
                <div className="space-y-2">
                  <Label htmlFor="staff-first-name">First name</Label>
                  <Input id="staff-first-name" {...form.register('firstName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-last-name">Last name</Label>
                  <Input id="staff-last-name" {...form.register('lastName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-role">Role</Label>
                  <select
                    id="staff-role"
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...form.register('role')}
                  >
                    <option value="waiter">Waiter — mark served / mark cash paid only</option>
                    <option value="kitchen">Kitchen — accept order / mark ready only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-pin">4-digit PIN</Label>
                  <Input
                    id="staff-pin"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1234"
                    {...form.register('pin')}
                  />
                  {form.formState.errors.pin ? (
                    <p className="text-sm text-destructive">{form.formState.errors.pin.message}</p>
                  ) : null}
                </div>
                {createStaff.isError ? (
                  <p className="text-sm text-destructive">
                    {createStaff.error instanceof Error
                      ? createStaff.error.message
                      : 'Unable to add staff member'}
                  </p>
                ) : null}
                <Button className="w-full" type="submit" disabled={createStaff.isPending}>
                  {createStaff.isPending ? 'Adding…' : 'Add staff member'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
            description="Add a waiter or kitchen PIN login so they can use the shared device without your credentials."
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
                  variant="outline"
                  size="sm"
                  onClick={() => deleteStaff.mutate(member.id)}
                  disabled={deleteStaff.isPending}
                >
                  Remove
                </Button>
              </CardHeader>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
