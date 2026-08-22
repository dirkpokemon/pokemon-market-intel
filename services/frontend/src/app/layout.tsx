import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { ToastProvider } from '@/components/ToastContainer';
import CookieBanner from '@/components/CookieBanner';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://charming-contentment-production-ce0e.up.railway.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'TCG Pulse — EU Pokémon price alerts',
    template: '%s | TCG Pulse',
  },
  description: 'EU price intelligence and price-drop alerts for Pokémon TCG singles.',
  keywords: ['TCG', 'Pokémon', 'trading cards', 'singles', 'market', 'prices', 'EU', 'CardTrader', 'price alerts'],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'TCG Pulse',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    siteName: 'TCG Pulse',
    title: 'TCG Pulse — EU Pokémon price alerts',
    description: 'Find Pokémon singles below market price and get alerted when your target hits.',
    url: SITE_URL,
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'TCG Pulse' }],
  },
  twitter: {
    card: 'summary',
    title: 'TCG Pulse — EU Pokémon price alerts',
    description: 'Find Pokémon singles below market price and get alerted when your target hits.',
    images: ['/icon-512.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100`}>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInit }} />
        <ToastProvider>
          {children}
          <CookieBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
