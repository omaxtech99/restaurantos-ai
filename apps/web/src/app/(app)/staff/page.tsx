'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  CardContent,
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
import { apiRequest, useAuthStore } from '@/lib/api';

type StaffForm = z.infer<typeof createStaffSchema>;

const ROLE_LABEL: Record<string, string> = {
  waiter: 'Waiter',
  kitchen: 'Kitchen',
};

export default function StaffPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

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
    <div className="mx-auto w-full max-w-3xl space-y-4 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Staff — waiter &amp; kitchen PIN logins
          </h1>
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      {user?.tenantSlug ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standalone PIN login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Staff can sign in directly on their own device at{' '}
              <Link href={`/staff-login?code=${user.tenantSlug}`} className="text-foreground hover:underline">
                /staff-login
              </Link>{' '}
              using this restaurant code — no need to unlock the device first.
            </p>
            <p className="rounded-lg border bg-muted px-3 py-2 font-mono text-base text-foreground">
              {user.tenantSlug}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
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
      </div>
    </div>
  );
}
