'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderStatusValue } from '@restaurantos/shared';
import type { BranchWithTables, OrderWithItems } from '@restaurantos/types';
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

const KITCHEN_STATUSES: OrderStatusValue[] = ['open', 'in_kitchen'];

function formatElapsed(createdAt: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

export default function KitchenPage() {
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

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const tableLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const branch of branchesQuery.data ?? []) {
      for (const table of branch.tables) {
        map.set(table.id, `${branch.name} – ${table.label}`);
      }
    }
    return map;
  }, [branchesQuery.data]);

  const kitchenOrders = useMemo(
    () =>
      (ordersQuery.data ?? [])
        .filter((order) => KITCHEN_STATUSES.includes(order.status))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [ordersQuery.data],
  );

  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatusValue }) =>
      apiRequest(`/orders/${orderId}/kitchen-status`, {
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
        <h1 className="font-display text-2xl font-semibold tracking-tight">Kitchen — live orders</h1>
      </div>

      <div className="space-y-4">
        {ordersQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : kitchenOrders.length === 0 ? (
          <EmptyState
            title="Nothing to cook right now"
            description="New orders will appear here the moment they come in — no refresh needed."
          />
        ) : (
          kitchenOrders.map((order) => (
            <Card key={order.id} className="animate-fade-in">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{tableLabelById.get(order.tableId) ?? 'Unknown table'}</CardTitle>
                  <CardDescription>{formatElapsed(order.createdAt, now)}</CardDescription>
                </div>
                <Badge variant={order.status === 'open' ? 'outline' : 'secondary'}>
                  {order.status === 'open' ? 'New' : 'In kitchen'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.name}
                        {item.notes ? ` (${item.notes})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
                {order.status === 'open' ? (
                  <Button
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ orderId: order.id, status: 'in_kitchen' })}
                  >
                    Accept order
                  </Button>
                ) : (
                  <Button
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ orderId: order.id, status: 'ready' })}
                  >
                    Mark ready
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
