'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { joinWaitlistSchema } from '@restaurantos/shared';
import type { BranchWithTables, WaitlistEntry } from '@restaurantos/types';
import { z } from 'zod';
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
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  Skeleton,
} from '@restaurantos/ui';
import { apiRequest, useAuthStore } from '@/lib/api';
import { useWaitlistUpdates } from '@/lib/use-waitlist-updates';

type WaitlistForm = z.infer<typeof joinWaitlistSchema>;

function formatWaitTime(createdAt: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function WaitlistPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const queryClient = useQueryClient();

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiRequest<BranchWithTables[]>('/branches', { auth: true }),
    enabled: Boolean(accessToken),
  });

  const waitlistQuery = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => apiRequest<WaitlistEntry[]>('/waitlist', { auth: true }),
    enabled: Boolean(accessToken),
    refetchInterval: 30_000,
  });

  useWaitlistUpdates(accessToken, () => {
    queryClient.invalidateQueries({ queryKey: ['waitlist'] });
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const branches = branchesQuery.data ?? [];
  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const branch of branches) map.set(branch.id, branch.name);
    return map;
  }, [branches]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<WaitlistForm>({
    resolver: zodResolver(joinWaitlistSchema),
    defaultValues: { branchId: '', customerName: '', phone: '', partySize: 2 },
  });

  useEffect(() => {
    const firstBranch = branches[0];
    if (firstBranch && !form.getValues('branchId')) {
      form.setValue('branchId', firstBranch.id);
    }
  }, [branches, form]);

  const joinWaitlist = useMutation({
    mutationFn: (values: WaitlistForm) =>
      apiRequest('/waitlist', { method: 'POST', auth: true, body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      form.reset({ branchId: form.getValues('branchId'), customerName: '', phone: '', partySize: 2 });
      setDialogOpen(false);
    },
  });

  const markSeated = useMutation({
    mutationFn: (id: string) => apiRequest(`/waitlist/${id}/seated`, { method: 'PATCH', auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  });

  const cancelEntry = useMutation({
    mutationFn: (id: string) => apiRequest(`/waitlist/${id}/cancel`, { method: 'PATCH', auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  });

  if (!hasHydrated || !accessToken) {
    return null;
  }

  const entries = (waitlistQuery.data ?? [])
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Waitlist — walk-in queue</h1>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={branches.length === 0}>Add walk-in</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to waitlist</DialogTitle>
                <DialogDescription>
                  They&apos;ll get a WhatsApp message automatically the moment a table frees up.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((values) => joinWaitlist.mutate(values))}
              >
                <div className="space-y-2">
                  <Label htmlFor="waitlist-branch">Branch</Label>
                  <select
                    id="waitlist-branch"
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...form.register('branchId')}
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-name">Customer name</Label>
                  <Input id="waitlist-name" {...form.register('customerName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-phone">Phone (with country code)</Label>
                  <Input id="waitlist-phone" placeholder="+919876543210" {...form.register('phone')} />
                  {form.formState.errors.phone ? (
                    <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-party-size">Party size</Label>
                  <Input
                    id="waitlist-party-size"
                    type="number"
                    min={1}
                    max={50}
                    {...form.register('partySize', { valueAsNumber: true })}
                  />
                  {form.formState.errors.partySize ? (
                    <p className="text-sm text-destructive">{form.formState.errors.partySize.message}</p>
                  ) : null}
                </div>
                {joinWaitlist.isError ? (
                  <p className="text-sm text-destructive">
                    {joinWaitlist.error instanceof Error
                      ? joinWaitlist.error.message
                      : 'Unable to add to waitlist'}
                  </p>
                ) : null}
                <Button className="w-full" type="submit" disabled={joinWaitlist.isPending}>
                  {joinWaitlist.isPending ? 'Adding…' : 'Add to waitlist'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {waitlistQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No one waiting"
            description="Add a walk-in here when the restaurant is full — they'll be notified by WhatsApp the moment a table opens up."
          />
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="animate-fade-in">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{entry.customerName}</CardTitle>
                  <CardDescription>
                    {branchNameById.get(entry.branchId) ?? 'Unknown branch'} · Party of{' '}
                    {entry.partySize} · {entry.phone} · waiting {formatWaitTime(entry.createdAt, now)}
                  </CardDescription>
                </div>
                <Badge variant={entry.status === 'notified' ? 'default' : 'secondary'}>
                  {entry.status === 'notified' ? 'Notified — table ready' : 'Waiting'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={markSeated.isPending}
                    onClick={() => markSeated.mutate(entry.id)}
                  >
                    Mark seated
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cancelEntry.isPending}
                    onClick={() => cancelEntry.mutate(entry.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
