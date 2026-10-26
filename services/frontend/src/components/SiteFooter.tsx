'use client';

import Link from 'next/link';
import { SITE_CONTACT_EMAIL } from '@/lib/site';

type SiteFooterProps = {
  /** Show Pricing + Login (landing only) */
  showMarketingLinks?: boolean;
  className?: string;
};

export default function SiteFooter({ showMarketingLinks, className = '' }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-950/80 ${className}`}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 order-2 sm:order-1">
            &copy; {year} TCG Pulse
          </p>
          <nav
            className="order-1 sm:order-2 flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-1 text-[11px] text-gray-400 dark:text-gray-500"
            aria-label="Juridisch en contact"
          >
            <a
              href={`mailto:${SITE_CONTACT_EMAIL}?subject=${encodeURIComponent('TCG Pulse contact')}`}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-sm"
            >
              Contact
            </a>
            <Link href="/legal" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-sm">
              Colofon
            </Link>
            <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-sm">
              Voorwaarden
            </Link>
            <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-sm">
              Privacy
            </Link>
            {showMarketingLinks && (
              <>
                <Link href="/pricing" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-sm">
                  Abonnementen
                </Link>
                <Link href="/login" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-sm">
                  Inloggen
                </Link>
              </>
            )}
          </nav>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-gray-400 dark:text-gray-600 text-center sm:text-left">
          TCG Pulse is een onafhankelijke prijstool en is niet verbonden aan, goedgekeurd of gesponsord door Nintendo,
          Creatures Inc., GAME FREAK inc. of The Pokémon Company. &ldquo;Pokémon&rdquo; en alle bijbehorende namen zijn
          handelsmerken van hun respectieve eigenaren en worden hier alleen ter herkenning gebruikt. Prijzen komen van
          CardTrader en zijn ter informatie — geen financieel advies.
        </p>
      </div>
    </footer>
  );
}
