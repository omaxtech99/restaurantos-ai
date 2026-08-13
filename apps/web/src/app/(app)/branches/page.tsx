'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBranchSchema, createTableSchema } from '@restaurantos/shared';
import type { BranchWithTables, Table as TableRecord } from '@restaurantos/types';
import { z } from 'zod';
import QRCode from 'qrcode';
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
import { apiRequest, useAuthStore } from '@/lib/api';

type BranchForm = z.infer<typeof createBranchSchema>;
type TableForm = z.infer<typeof createTableSchema>;

export default function BranchesPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const queryClient = useQueryClient();

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

  const [qrTable, setQrTable] = useState<TableRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const orderUrl = qrTable && typeof window !== 'undefined' ? `${window.location.origin}/t/${qrTable.id}` : '';

  useEffect(() => {
    if (!qrTable || !orderUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(orderUrl, { width: 240, margin: 1 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [qrTable, orderUrl]);

  if (!hasHydrated || !accessToken) {
    return null;
  }

  const branches = branchesQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Branches &amp; tables</h1>
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      <div className="space-y-6">
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
                            {...tableForm.register('capacity', {
                              setValueAs: (value) =>
                                value === '' || value === null || value === undefined
                                  ? undefined
                                  : Number(value),
                            })}
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
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setQrTable(table)}>
                                Order QR
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTable.mutate(table.id)}
                                disabled={deleteTable.isPending}
                              >
                                Delete
                              </Button>
                            </div>
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
      </div>

      <Dialog
        open={qrTable !== null}
        onOpenChange={(open) => {
          if (!open) {
            setQrTable(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{qrTable?.label} &middot; ordering QR</DialogTitle>
            <DialogDescription>
              Print this and place it on the table. Scanning opens the menu directly &mdash; no
              app or login required.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR code linking to the order page for ${qrTable?.label}`}
                width={240}
                height={240}
                className="rounded-xl border"
              />
            ) : (
              <Skeleton className="h-60 w-60" />
            )}
            <div className="flex w-full items-center gap-2">
              <Input readOnly value={orderUrl} className="text-xs" />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(orderUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
