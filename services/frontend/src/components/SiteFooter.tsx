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
      className={`border-t border-gray-100 bg-gray-50/40 ${className}`}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-gray-400 order-2 sm:order-1">
            &copy; {year} Pok&eacute;mon Market Intel EU
          </p>
          <nav
            className="order-1 sm:order-2 flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-1 text-[11px] text-gray-400"
            aria-label="Legal and contact"
          >
            <a
              href={`mailto:${SITE_CONTACT_EMAIL}?subject=Pokemon%20Market%20Intel%20%E2%80%94%20Contact`}
              className="hover:text-gray-600 transition-colors"
            >
              Contact
            </a>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">
              Privacy
            </Link>
            {showMarketingLinks && (
              <>
                <Link href="/pricing" className="hover:text-gray-600 transition-colors">
                  Pricing
                </Link>
                <Link href="/login" className="hover:text-gray-600 transition-colors">
                  Login
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
