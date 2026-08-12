import type { Metadata } from 'next';
import { Outfit, Sora } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import '@restaurantos/ui/globals.css';

const sans = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

const display = Sora({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'RestaurantOS AI',
  description: 'Multi-tenant operating system for dine-in restaurants.',
  openGraph: {
    title: 'RestaurantOS AI',
    description: 'Multi-tenant operating system for dine-in restaurants.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
