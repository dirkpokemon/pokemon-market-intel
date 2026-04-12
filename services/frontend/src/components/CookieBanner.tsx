'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** Stored when the user dismisses the notice (essential use only for now). */
export const COOKIE_NOTICE_STORAGE_KEY = 'pokemon_intel_cookie_notice';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, '1');
    } catch {
      /* ignore private mode */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-gray-200/80 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      role="dialog"
      aria-label="Cookies and privacy"
      aria-live="polite"
    >
      <div className="max-w-5xl mx-auto px-4 py-3 sm:py-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 leading-relaxed sm:pr-4">
          We use essential cookies and similar storage (for example to keep you signed in) to run this service. We do not
          use third-party marketing cookies today.{' '}
          <Link
            href="/privacy"
            className="text-gray-700 dark:text-gray-200 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white rounded-sm"
          >
            Privacy
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 self-end sm:self-center px-4 py-1.5 rounded-lg bg-gray-900 dark:bg-indigo-600 text-white text-xs font-medium hover:bg-gray-800 dark:hover:bg-indigo-500 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
