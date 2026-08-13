'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderStatusValue } from '@restaurantos/shared';
import type { BranchWithTables, OrderWithItems, WaiterCallEvent } from '@restaurantos/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from '@restaurantos/ui';
import { apiRequest, useAuthStore } from '@/lib/api';
import { useOrderUpdates } from '@/lib/use-order-updates';
import { useWaiterCalls } from '@/lib/use-waiter-calls';

const WAITER_STATUSES: OrderStatusValue[] = ['ready', 'served'];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function WaiterPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const queryClient = useQueryClient();

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiRequest<BranchWithTables[]>('/branches', { auth: true }),
    enabled: Boolean(accessToken),
  });

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiRequest<OrderWithItems[]>('/orders', { auth: true }),
    enabled: Boolean(accessToken),
    refetchInterval: 30_000,
  });

  useOrderUpdates(accessToken, () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  });

  const tableLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const branch of branchesQuery.data ?? []) {
      for (const table of branch.tables) {
        map.set(table.id, `${branch.name} – ${table.label}`);
      }
    }
    return map;
  }, [branchesQuery.data]);

  const [calls, setCalls] = useState<(WaiterCallEvent & { id: string })[]>([]);
  useWaiterCalls(accessToken, (event) => {
    setCalls((current) => [{ ...event, id: `${event.tableId}-${event.calledAt}` }, ...current]);
  });

  const waiterOrders = useMemo(
    () =>
      (ordersQuery.data ?? [])
        .filter((order) => WAITER_STATUSES.includes(order.status))
        .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()),
    [ordersQuery.data],
  );

  // A waiter can only ever do one of two things to an order: hand it over,
  // or record that the table paid in cash. No order-taking, no editing, no
  // cancelling — that boundary is enforced here by simply never rendering
  // any other action, by design (see docs/12_PRODUCT_SCOPE.md Pillar 4).
  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatusValue }) =>
      apiRequest(`/orders/${orderId}/waiter-status`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  if (!hasHydrated || !accessToken) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-6 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Waiter — live orders</h1>
      </div>

      {calls.length > 0 ? (
        <div className="space-y-2">
          {calls.map((call) => (
            <div
              key={call.id}
              className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 animate-fade-in dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              <span>
                <strong>{tableLabelById.get(call.tableId) ?? 'A table'}</strong> needs a waiter
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalls((current) => current.filter((item) => item.id !== call.id))}
              >
                Dismiss
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {ordersQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : waiterOrders.length === 0 ? (
          <EmptyState
            title="Nothing to deliver right now"
            description="Orders show up here the moment the kitchen marks them ready."
          />
        ) : (
          waiterOrders.map((order) => (
            <Card key={order.id} className="animate-fade-in">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{tableLabelById.get(order.tableId) ?? 'Unknown table'}</CardTitle>
                  <CardDescription>{formatPrice(order.totalCents)} total</CardDescription>
                </div>
                <Badge variant={order.status === 'ready' ? 'secondary' : 'default'}>
                  {order.status === 'ready' ? 'Ready' : 'Served — awaiting payment'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm text-muted-foreground">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.name}
                        {item.notes ? <span className="block text-xs italic">{item.notes}</span> : null}
                      </span>
                      <span>{formatPrice(item.quantity * item.unitPriceCents)}</span>
                    </div>
                  ))}
                </div>
                {order.status === 'ready' ? (
                  <Button
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ orderId: order.id, status: 'served' })}
                  >
                    Mark served
                  </Button>
                ) : (
                  <Button
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ orderId: order.id, status: 'paid' })}
                  >
                    Mark paid (cash)
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
