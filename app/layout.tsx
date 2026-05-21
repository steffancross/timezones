import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import env from '@/lib/env';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: env.NEXT_PUBLIC_SITE_NAME,
    template: `%s | ${env.NEXT_PUBLIC_SITE_NAME}`,
  },
  description: 'Replace per site.',
  openGraph: {
    siteName: env.NEXT_PUBLIC_SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Light mode is the default — no `data-theme` attribute applied. A future
  // toggle in Header can set `document.documentElement.dataset.theme = 'dark'`
  // (and persist to localStorage) to opt into dark mode. No auto-detection of
  // the OS preference.
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
