'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@restaurantos/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { apiRequest, useAuthStore } from '@/lib/api';

export default function AppShellPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (hasHydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hasHydrated, accessToken, router]);

  if (!hasHydrated || !accessToken || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_40%),hsl(var(--background))]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight">RestaurantOS</p>
          <p className="text-sm text-muted-foreground">Foundation workspace shell</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" asChild>
            <Link href="/menu">Menu</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/branches">Branches</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/orders">Orders</Link>
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await apiRequest('/auth/logout', { method: 'POST', auth: true });
              } finally {
                clearSession();
                router.replace('/login');
              }
            }}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 pb-16">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>
              Hello, {user.firstName} {user.lastName}
            </CardTitle>
            <CardDescription>
              Authentication, tenant context, and RBAC are ready. Product modules will plug into
              this shell later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Email: {user.email}</p>
            <p>Tenant: {user.tenantId}</p>
            <p>Roles: {user.roles.join(', ') || 'none'}</p>
            <Link href="/login" className="inline-block pt-2 text-foreground hover:underline">
              Auth routes
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
