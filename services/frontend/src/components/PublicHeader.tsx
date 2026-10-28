'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandMark from '@/components/BrandMark';
import { ThemeIconButton } from '@/components/ThemeToggle';
import { useLoggedIn } from '@/lib/useLoggedIn';
import { loginHref } from '@/lib/next-path';

const LINKS = [
  { href: '/prijscheck', label: 'Prijscheck' },
  { href: '/lijstprijs', label: 'Lijstprijs' },
  { href: '/pricing', label: 'Prijzen' },
];

/** Header of every page outside the dashboard: same links everywhere, also on phones. */
export default function PublicHeader() {
  const pathname = usePathname();
  const loggedIn = useLoggedIn();

  const linkClass = (href: string) =>
    `px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
      pathname === href
        ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <header className="border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <Link href={loggedIn ? '/home' : '/'} className="flex items-center gap-2.5 rounded-lg min-w-0" aria-label="TCG Pulse, naar de startpagina">
          <BrandMark size={34} />
          <span className="text-base font-bold text-gray-900 dark:text-white truncate">TCG Pulse</span>
        </Link>

        <nav aria-label="Hoofdmenu" className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)} aria-current={pathname === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeIconButton />
          {loggedIn ? (
            <Link
              href="/home"
              className="bg-gray-900 dark:bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-500 transition text-sm font-medium whitespace-nowrap"
            >
              Naar dashboard
            </Link>
          ) : (
            <>
              <Link href={loginHref(pathname)} className={linkClass('/login')}>
                Inloggen
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex bg-gray-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-500 transition text-sm font-medium whitespace-nowrap"
              >
                Gratis beginnen
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Phones: the same links in a second row */}
      <nav aria-label="Hoofdmenu" className="md:hidden border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-2 flex items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)} aria-current={pathname === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
