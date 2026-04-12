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

  const primaryBtn =
    variant === 'card'
      ? 'w-full py-2.5 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 min-h-[42px] border border-gray-200 text-gray-700 hover:bg-gray-50'
      : 'w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-center bg-indigo-600 text-white hover:bg-indigo-700 transition';

  return (
    <div className="space-y-2 w-full">
      <a href={businessWaitlistMailto()} className={primaryBtn}>
        {CTA_BUSINESS_WAITLIST}
      </a>
      <a
        href={businessWaitlistGmailUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2 px-4 rounded-lg text-sm font-medium text-center block border border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100 transition"
      >
        Open in Gmail (browser)
      </a>
      <div className="flex flex-col items-stretch gap-1 pt-1">
        <button
          type="button"
          onClick={copyEmail}
          className="w-full py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
        >
          {copied ? 'Copied to clipboard' : `Copy ${email}`}
        </button>
      </div>
    </div>
  );
}
