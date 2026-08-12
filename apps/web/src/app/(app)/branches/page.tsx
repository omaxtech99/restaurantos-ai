'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBranchSchema, createTableSchema } from '@restaurantos/shared';
import type { BranchWithTables } from '@restaurantos/types';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { apiRequest, useAuthStore } from '@/lib/api';

type BranchForm = z.infer<typeof createBranchSchema>;
type TableForm = z.infer<typeof createTableSchema>;

export default function BranchesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasHydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hasHydrated, accessToken, router]);

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiRequest<BranchWithTables[]>('/branches', { auth: true }),
    enabled: Boolean(accessToken),
  });

  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [tableDialogBranchId, setTableDialogBranchId] = useState<string | null>(null);

  const branchForm = useForm<BranchForm>({
    resolver: zodResolver(createBranchSchema),
    defaultValues: { name: '', address: '' },
  });

  const createBranch = useMutation({
    mutationFn: (values: BranchForm) =>
      apiRequest('/branches', { method: 'POST', auth: true, body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      branchForm.reset();
      setBranchDialogOpen(false);
    },
  });

  const deleteBranch = useMutation({
    mutationFn: (branchId: string) =>
      apiRequest(`/branches/${branchId}`, { method: 'DELETE', auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });

  const tableForm = useForm<TableForm>({
    resolver: zodResolver(createTableSchema),
    defaultValues: { label: '' },
  });

  const createTable = useMutation({
    mutationFn: ({ branchId, values }: { branchId: string; values: TableForm }) =>
      apiRequest(`/branches/${branchId}/tables`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      tableForm.reset();
      setTableDialogBranchId(null);
    },
  });

  const deleteTable = useMutation({
    mutationFn: (tableId: string) =>
      apiRequest(`/tables/${tableId}`, { method: 'DELETE', auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });

  if (!hasHydrated || !accessToken) {
    return null;
  }

  const branches = branchesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_40%),hsl(var(--background))]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
        <div>
          <Link
            href="/app"
            className="font-display text-2xl font-semibold tracking-tight hover:underline"
          >
            RestaurantOS
          </Link>
          <p className="text-sm text-muted-foreground">Branches &amp; tables</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
            <DialogTrigger asChild>
              <Button>New branch</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New branch</DialogTitle>
                <DialogDescription>Add another restaurant location.</DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={branchForm.handleSubmit((values) => createBranch.mutate(values))}
              >
                <div className="space-y-2">
                  <Label htmlFor="branch-name">Name</Label>
                  <Input id="branch-name" {...branchForm.register('name')} />
                  {branchForm.formState.errors.name ? (
                    <p className="text-sm text-destructive">
                      {branchForm.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch-address">Address (optional)</Label>
                  <Input id="branch-address" {...branchForm.register('address')} />
                </div>
                {createBranch.isError ? (
                  <p className="text-sm text-destructive">
                    {createBranch.error instanceof Error
                      ? createBranch.error.message
                      : 'Unable to create branch'}
                  </p>
                ) : null}
                <Button className="w-full" type="submit" disabled={createBranch.isPending}>
                  {createBranch.isPending ? 'Creating…' : 'Create branch'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-6 px-6 pb-16">
        {branchesQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : branches.length === 0 ? (
          <EmptyState title="No branches yet" description="Create your first branch to add tables." />
        ) : (
          branches.map((branch) => (
            <Card key={branch.id} className="animate-fade-in">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{branch.name}</CardTitle>
                  {branch.address ? <CardDescription>{branch.address}</CardDescription> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Dialog
                    open={tableDialogBranchId === branch.id}
                    onOpenChange={(open) => setTableDialogBranchId(open ? branch.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Add table
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New table in {branch.name}</DialogTitle>
                      </DialogHeader>
                      <form
                        className="space-y-4"
                        onSubmit={tableForm.handleSubmit((values) =>
                          createTable.mutate({ branchId: branch.id, values }),
                        )}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="table-label">Label</Label>
                          <Input id="table-label" placeholder="Table 5" {...tableForm.register('label')} />
                          {tableForm.formState.errors.label ? (
                            <p className="text-sm text-destructive">
                              {tableForm.formState.errors.label.message}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="table-capacity">Capacity (optional)</Label>
                          <Input
                            id="table-capacity"
                            type="number"
                            min={1}
                            {...tableForm.register('capacity', { valueAsNumber: true })}
                          />
                        </div>
                        {createTable.isError ? (
                          <p className="text-sm text-destructive">
                            {createTable.error instanceof Error
                              ? createTable.error.message
                              : 'Unable to create table'}
                          </p>
                        ) : null}
                        <Button className="w-full" type="submit" disabled={createTable.isPending}>
                          {createTable.isPending ? 'Adding…' : 'Add table'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteBranch.mutate(branch.id)}
                    disabled={deleteBranch.isPending}
                  >
                    Delete branch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {branch.tables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tables yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branch.tables.map((table) => (
                        <TableRow key={table.id}>
                          <TableCell className="font-medium">{table.label}</TableCell>
                          <TableCell>{table.capacity ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={table.status === 'available' ? 'default' : 'secondary'}>
                              {table.status === 'available' ? 'Available' : 'Occupied'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTable.mutate(table.id)}
                              disabled={deleteTable.isPending}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
