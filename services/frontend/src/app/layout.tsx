import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ToastContainer';
import CookieBanner from '@/components/CookieBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TCG Pulse',
  description: 'EU market intelligence for trading card singles',
  keywords: ['TCG', 'trading cards', 'singles', 'market', 'prices', 'EU', 'CardMarket', 'CardTrader'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
          <CookieBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
