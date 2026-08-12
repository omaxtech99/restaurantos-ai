import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_45%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)))]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 dark:opacity-20" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/login" className="font-display text-xl font-semibold tracking-tight">
            RestaurantOS
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center">{children}</main>
      </div>
    </div>
  );
}
