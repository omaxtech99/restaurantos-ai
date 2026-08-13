'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { OrderWithItems, WaitlistEntry } from '@restaurantos/types';
import { PERMISSIONS } from '@restaurantos/shared';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@restaurantos/ui';
import { apiRequest, useAuthStore } from '@/lib/api';

const OPEN_STATUSES = ['open', 'in_kitchen', 'ready'];

const QUICK_LINKS: { href: string; label: string; permission?: string }[] = [
  { href: '/orders', label: 'Orders', permission: PERMISSIONS.ORDER_MANAGE },
  { href: '/kitchen', label: 'Kitchen', permission: PERMISSIONS.ORDER_KITCHEN },
  { href: '/waiter', label: 'Waiter', permission: PERMISSIONS.ORDER_SERVE },
  { href: '/menu', label: 'Menu', permission: PERMISSIONS.MENU_MANAGE },
  { href: '/branches', label: 'Branches', permission: PERMISSIONS.BRANCH_MANAGE },
  { href: '/waitlist', label: 'Waitlist', permission: PERMISSIONS.WAITLIST_READ },
  { href: '/staff', label: 'Staff', permission: PERMISSIONS.STAFF_MANAGE },
];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const permissions = new Set(user?.permissions ?? []);
  const canReadOrders = permissions.has(PERMISSIONS.ORDER_READ);
  const canReadWaitlist = permissions.has(PERMISSIONS.WAITLIST_READ);

  const ordersQuery = useQuery({
    queryKey: ['dashboard-orders'],
    queryFn: () => apiRequest<OrderWithItems[]>('/orders', { auth: true }),
    enabled: Boolean(accessToken) && canReadOrders,
    refetchInterval: 30_000,
  });

  const waitlistQuery = useQuery({
    queryKey: ['dashboard-waitlist'],
    queryFn: () => apiRequest<WaitlistEntry[]>('/waitlist', { auth: true }),
    enabled: Boolean(accessToken) && canReadWaitlist,
    refetchInterval: 30_000,
  });

  if (!user) {
    return null;
  }

  const orders = ordersQuery.data ?? [];
  const openOrdersCount = orders.filter((order) => OPEN_STATUSES.includes(order.status)).length;
  const readyCount = orders.filter((order) => order.status === 'ready').length;
  const waitlistCount = waitlistQuery.data?.length ?? 0;
  const links = QUICK_LINKS.filter((link) => !link.permission || permissions.has(link.permission));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Welcome back, {user.firstName}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening right now.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canReadOrders ? (
          <>
            <Card className="animate-fade-in">
              <CardHeader className="pb-2">
                <CardDescription>Open orders</CardDescription>
                {ordersQuery.isLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <CardTitle className="text-3xl">{openOrdersCount}</CardTitle>
                )}
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Across open, in-kitchen, and ready
              </CardContent>
            </Card>
            <Card className="animate-fade-in">
              <CardHeader className="pb-2">
                <CardDescription>Ready to serve</CardDescription>
                {ordersQuery.isLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <CardTitle className="text-3xl">{readyCount}</CardTitle>
                )}
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Waiting on a waiter</CardContent>
            </Card>
          </>
        ) : null}
        {canReadWaitlist ? (
          <Card className="animate-fade-in">
            <CardHeader className="pb-2">
              <CardDescription>Active waitlist</CardDescription>
              {waitlistQuery.isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{waitlistCount}</CardTitle>
              )}
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Walk-ins waiting for a table</CardContent>
          </Card>
        ) : null}
      </div>

      {links.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Button key={link.href} variant="outline" asChild>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
