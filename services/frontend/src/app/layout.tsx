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
    default: 'TCG Pulse — eerlijke Pokémon-prijzen in Europa',
    template: '%s | TCG Pulse',
  },
  description: 'Prijscheck, lijstprijs inclusief verzending en prijsalerts voor Pokémon-kaarten in Europa.',
  keywords: ['TCG', 'Pokémon', 'Pokémon kaarten', 'prijscheck', 'kaartprijzen', 'singles', 'EU', 'CardTrader', 'prijsalert'],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'TCG Pulse',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    siteName: 'TCG Pulse',
    title: 'TCG Pulse — eerlijke Pokémon-prijzen in Europa',
    description: 'Check of een prijs eerlijk is, bereken je lijst inclusief verzending en krijg een alert bij je doelprijs.',
    url: SITE_URL,
    locale: 'nl_NL',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'TCG Pulse' }],
  },
  twitter: {
    card: 'summary',
    title: 'TCG Pulse — eerlijke Pokémon-prijzen in Europa',
    description: 'Check of een prijs eerlijk is, bereken je lijst inclusief verzending en krijg een alert bij je doelprijs.',
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
    <html lang="nl" suppressHydrationWarning>
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
