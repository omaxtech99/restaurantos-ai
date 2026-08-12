import type { Metadata } from 'next';
import { Outfit, Sora } from 'next/font/google';
import '@restaurantos/ui/globals.css';
import { AppProviders } from '@/components/providers';

const sans = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

const display = Sora({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'RestaurantOS',
  description: 'RestaurantOS AI platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} font-sans`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
