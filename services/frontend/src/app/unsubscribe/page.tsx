'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { notificationApi } from '@/lib/api';
import SiteFooter from '@/components/SiteFooter';

type State = 'confirm' | 'loading' | 'done' | 'error';

const KIND_LABEL: Record<string, string> = {
  digest: 'de dagelijkse e-mail digest',
  alerts: 'prijsalerts van je watchlist',
};

function UnsubscribeContent() {
  const params = useSearchParams();
  const u = Number(params.get('u'));
  const k = params.get('k') || '';
  const t = params.get('t') || '';
  const valid = Number.isInteger(u) && u > 0 && k in KIND_LABEL && t.length > 0;
  const [state, setState] = useState<State>(valid ? 'confirm' : 'error');
  const [error, setError] = useState(valid ? '' : 'Deze afmeldlink is onvolledig. Gebruik de link uit de e-mail.');

  // Requires a click: mail scanners that prefetch links must not unsubscribe people.
  const confirm = async () => {
    setState('loading');
    try {
      await notificationApi.unsubscribe({ u, k, t });
      setState('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Afmelden is mislukt.');
      setState('error');
    }
  };

  const label = KIND_LABEL[k] ?? 'deze e-mails';

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {state === 'done' ? 'Je bent afgemeld' : state === 'error' ? 'Afmelden mislukt' : 'Afmelden'}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
        {state === 'done' && `Je ontvangt geen ${label} meer. Je kunt dit altijd weer aanzetten via je instellingen.`}
        {state === 'error' && error}
        {(state === 'confirm' || state === 'loading') && `Wil je je afmelden voor ${label}?`}
      </p>

      {(state === 'confirm' || state === 'loading') && (
        <button
          type="button"
          onClick={confirm}
          disabled={state === 'loading'}
          className="inline-block bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-2.5 px-8 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition text-sm font-medium disabled:opacity-60"
        >
          {state === 'loading' ? 'Bezig…' : 'Ja, afmelden'}
        </button>
      )}

      {(state === 'done' || state === 'error') && (
        <Link
          href="/settings"
          className="inline-block bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-2.5 px-8 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition text-sm font-medium"
        >
          Naar instellingen
        </Link>
      )}
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
          <Suspense fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Laden…</p>}>
            <UnsubscribeContent />
          </Suspense>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
