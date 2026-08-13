'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Building2,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  UserSquare2,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { PERMISSIONS } from '@restaurantos/shared';
import { Button, cn } from '@restaurantos/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { apiRequest, useAuthStore } from '@/lib/api';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Undefined = visible to anyone with a valid session (e.g. the dashboard itself). */
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed, permission: PERMISSIONS.MENU_MANAGE },
  { href: '/branches', label: 'Branches', icon: Building2, permission: PERMISSIONS.BRANCH_MANAGE },
  { href: '/orders', label: 'Orders', icon: ClipboardList, permission: PERMISSIONS.ORDER_MANAGE },
  { href: '/kitchen', label: 'Kitchen', icon: ChefHat, permission: PERMISSIONS.ORDER_KITCHEN },
  { href: '/waiter', label: 'Waiter', icon: UserSquare2, permission: PERMISSIONS.ORDER_SERVE },
  { href: '/waitlist', label: 'Waitlist', icon: Users, permission: PERMISSIONS.WAITLIST_READ },
  { href: '/staff', label: 'Staff', icon: Users, permission: PERMISSIONS.STAFF_MANAGE },
  { href: '/switch-user', label: 'Switch user', icon: ArrowLeftRight, permission: PERMISSIONS.STAFF_READ },
];

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  waiter: 'Waiter',
  kitchen: 'Kitchen',
};

/**
 * Persistent, role-aware shell wrapping every authenticated (app) route.
 * Centralizes the auth-hydration redirect guard and nav that used to be
 * copy-pasted at the top of every page — see CLAUDE.md's "auth hydration
 * race" note for why this must gate on `hasHydrated`, not just `accessToken`.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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

  const permissions = new Set(user.permissions);
  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || permissions.has(item.permission));

  const signOut = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST', auth: true });
    } finally {
      clearSession();
      router.replace('/login');
    }
  };

  const roleLabels = user.roles.map((role) => ROLE_LABEL[role] ?? role).join(', ') || 'No role';

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_40%),hsl(var(--background))]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-background/60 px-4 py-6 backdrop-blur md:flex">
        <Link href="/app" className="font-display px-2 text-xl font-semibold tracking-tight">
          RestaurantOS
        </Link>

        <nav className="mt-8 flex-1 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-border/60 pt-4">
          <div className="px-2">
            <p className="truncate text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{roleLabels}</p>
          </div>
          <div className="flex items-center gap-2 px-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" className="flex-1" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/60 px-4 py-3 md:hidden">
          <Link href="/app" className="font-display text-lg font-semibold tracking-tight">
            RestaurantOS
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-border/60 px-4 py-2 md:hidden">
          {visibleItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
