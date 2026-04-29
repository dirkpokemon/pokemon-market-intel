'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { notificationApi, WatchlistItem } from '@/lib/api';

function PriceProgress({ current, target }: { current?: number | null; target: number }) {
  if (!current || current <= 0) return null;
  const hit = current <= target;
  const pct = hit ? 100 : Math.round((target / current) * 100);
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[11px] text-gray-400 mb-1">
        <span>Nu €{current.toFixed(2)}</span>
        <span>Doel €{target.toFixed(2)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${hit ? 'bg-emerald-500' : 'bg-indigo-400'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {hit && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
          🎯 Doelprijs bereikt!
        </p>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }

    notificationApi.getWatchlist()
      .then(data => setItems(data))
      .catch(() => setError('Kon watchlist niet laden'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleRemove = async (id: number) => {
    setRemoving(id);
    try {
      await notificationApi.removeWatchlistItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {
      // silently ignore
    } finally {
      setRemoving(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watchlist</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Ontvang een melding zodra een kaart jouw doelprijs bereikt
            </p>
          </div>
          <Link
            href="/deals"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            Kaart toevoegen
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nog geen alerts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
              Ga naar Top Deals, klik op een kaart en stel een prijsalert in via de knop &ldquo;Prijsalert&rdquo;.
            </p>
            <Link
              href="/deals"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition"
            >
              Bekijk Top Deals
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stats bar */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{items.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Totaal</p>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {items.filter(i => i.current_price != null && i.current_price <= i.target_price).length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bereikt</p>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {items.filter(i => !i.current_price || i.current_price > i.target_price).length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">In afwachting</p>
              </div>
            </div>

            {/* Item cards */}
            {items.map(item => {
              const hit = item.current_price != null && item.current_price <= item.target_price;
              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-gray-900 rounded-xl border p-4 transition ${
                    hit
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {item.card_name}
                        </h3>
                        {hit && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full uppercase tracking-wide">
                            Alert!
                          </span>
                        )}
                      </div>
                      {item.card_set && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{item.card_set}</p>
                      )}
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Doelprijs</p>
                          <p className="text-base font-bold text-gray-900 dark:text-white">
                            €{item.target_price.toFixed(2)}
                          </p>
                        </div>
                        {item.current_price != null && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Marktprijs</p>
                            <p className={`text-base font-bold ${
                              hit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'
                            }`}>
                              €{item.current_price.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                      <PriceProgress current={item.current_price} target={item.target_price} />
                      {item.notified_at && (
                        <p className="text-[11px] text-gray-400 mt-2">
                          Laatste alert:{' '}
                          {new Date(item.notified_at).toLocaleString('nl-NL', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removing === item.id}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition disabled:opacity-40"
                      aria-label="Verwijder"
                    >
                      {removing === item.id ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Help text */}
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4">
              Meldingen worden verstuurd via Telegram en/of e-mail.{' '}
              <Link href="/settings" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                Stel in via Instellingen.
              </Link>
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
