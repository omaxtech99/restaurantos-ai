import Link from 'next/link';
import { Button } from '@restaurantos/ui';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(15,23,42,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(15,23,42,0.08),transparent_30%),hsl(var(--background))]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:56px_56px] opacity-30 dark:opacity-20" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <p className="font-display text-xl font-semibold tracking-tight">RestaurantOS</p>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link href={`${appUrl}/login`}>Sign in</Link>
            </Button>
            <Button asChild>
              <Link href={`${appUrl}/signup`}>Get started</Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center gap-8 py-20 animate-fade-in">
          <div className="max-w-3xl space-y-6">
            <p className="font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl md:text-7xl">
              RestaurantOS
            </p>
            <h1 className="max-w-2xl text-2xl font-medium tracking-tight text-foreground/90 sm:text-3xl">
              The operating system for modern dine-in restaurants.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              A multi-tenant foundation for authentication, access control, and realtime operations —
              built to scale into every front-of-house and back-of-house workflow.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link href={`${appUrl}/signup`}>Start workspace</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`${appUrl}/login`}>Sign in</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
