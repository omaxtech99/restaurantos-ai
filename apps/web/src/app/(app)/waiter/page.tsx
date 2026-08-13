'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { ThemeToggle } from '@/components/theme-toggle';
import { apiRequest, useAuthStore } from '@/lib/api';
import { useOrderUpdates } from '@/lib/use-order-updates';

const WAITER_STATUSES: OrderStatusValue[] = ['ready', 'served'];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function WaiterPage() {
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_40%),hsl(var(--background))]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
        <div>
          <Link
            href="/app"
            className="font-display text-2xl font-semibold tracking-tight hover:underline"
          >
            RestaurantOS
          </Link>
          <p className="text-sm text-muted-foreground">Waiter — live orders</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" asChild>
            <Link href="/orders">All orders</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-4 px-6 pb-16">
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
      </main>
    </div>
  );
}
