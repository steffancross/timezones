import { AppToaster } from '@/components/site/AppToaster';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import env from '@/lib/env';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: env.NEXT_PUBLIC_SITE_NAME,
    template: `%s | ${env.NEXT_PUBLIC_SITE_NAME}`,
  },
  description:
    'Compare time across cities and zones with day/night and working-hour overlays. Fast, shareable, no signup.',
  openGraph: {
    siteName: env.NEXT_PUBLIC_SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
};

// Pre-hydration: applies the persisted theme to <html> before React mounts so
// dark-mode users don't see a flash of the light palette. No OS auto-detection.
const themeBoot = `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: tiny static theme-boot script */}
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <AppToaster />
        </Providers>
      </body>
    </html>
  );
}
