'use client';

import { useState } from 'react';
import {
  businessWaitlistEmail,
  businessWaitlistGmailUrl,
  businessWaitlistMailto,
  CTA_BUSINESS_WAITLIST,
} from '@/lib/plans';

type Variant = 'card' | 'settings';

/**
 * Waitlist CTAs: mailto (desktop client), Gmail in browser, copy email.
 * mailto alone often does nothing when no default mail app is set (e.g. Windows).
 */
export default function BusinessWaitlistActions({ variant = 'card' }: { variant?: Variant }) {
  const [copied, setCopied] = useState(false);
  const email = businessWaitlistEmail();

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy this email address:', email);
    }
  };

  const isSettings = variant === 'settings';

  const primaryBtn = isSettings
    ? 'w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-left flex items-center justify-center sm:justify-start bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 border border-indigo-500 dark:border-indigo-400 shadow-sm transition'
    : 'w-full py-2.5 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 min-h-[42px] border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800';

  const gmailBtn = isSettings
    ? 'w-full py-2.5 px-4 rounded-lg text-sm font-medium text-left flex items-center justify-center sm:justify-start border-2 border-violet-400/80 dark:border-violet-400/90 bg-violet-50 dark:bg-violet-950/70 text-violet-950 dark:text-violet-100 hover:bg-violet-100 dark:hover:bg-violet-900/80 transition'
    : 'w-full py-2 px-4 rounded-lg text-sm font-medium text-center block border border-violet-200 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/50 text-violet-900 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-950/80 transition';

  return (
    <div className={isSettings ? 'flex w-full flex-col gap-3' : 'space-y-2 w-full'}>
      <a href={businessWaitlistMailto()} className={primaryBtn}>
        {CTA_BUSINESS_WAITLIST}
      </a>
      <a href={businessWaitlistGmailUrl()} target="_blank" rel="noopener noreferrer" className={gmailBtn}>
        Open in Gmail (browser)
      </a>
      <button
        type="button"
        onClick={copyEmail}
        className={`w-full py-2 text-xs font-medium rounded-lg transition ${
          isSettings
            ? 'text-left text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/60 dark:hover:bg-white/10 underline-offset-2 hover:underline'
            : 'text-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline-offset-2 hover:underline'
        }`}
      >
        {copied ? 'Copied to clipboard' : `Copy ${email}`}
      </button>
    </div>
  );
}
