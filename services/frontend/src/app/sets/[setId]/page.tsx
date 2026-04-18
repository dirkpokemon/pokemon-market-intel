'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { findSetById, cardmarketSealedUrl, cardmarketSinglesUrl, PokemonSet } from '@/lib/pokemon-sets';
import { marketApi, DealScore } from '@/lib/api';

type View = 'sealed' | 'singles';

export default function SetDetailPage({ params }: { params: { setId: string } }) {
  const { setId } = params;
  const set = findSetById(setId);

  const [view, setView] = useState<View>('sealed');
  const [deals, setDeals] = useState<DealScore[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);

  useEffect(() => {
    if (view === 'singles' && set) {
      setDealsLoading(true);
      marketApi.getDealScores({ limit: 50, product_set: set.name })
        .then(setDeals)
        .catch(() => setDeals([]))
        .finally(() => setDealsLoading(false));
    }
  }, [view, set]);

  if (!set) {
    return (
      <DashboardLayout>
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">Set niet gevonden.</p>
          <Link href="/sets" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">← Terug naar sets</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1200px] mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/sets" className="hover:text-gray-700 dark:hover:text-gray-200">Sets</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{set.name}</span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{set.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{set.era.replace(/-/g, ' ')}</p>
        </div>

        {/* Toggle */}
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800/80 mb-6">
          <button
            onClick={() => setView('sealed')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              view === 'sealed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            📦 Sealed product
          </button>
          <button
            onClick={() => setView('singles')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              view === 'singles'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            🃏 Losse kaarten
          </button>
        </div>

        {/* SEALED VIEW */}
        {view === 'sealed' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Sealed box prijzen worden binnenkort automatisch bijgehouden. Klik hieronder om rechtstreeks naar de beste aanbiedingen te gaan.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* CardMarket */}
              <a
                href={cardmarketSealedUrl(set)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-lg">🛒</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">CardMarket</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Booster boxes &amp; sealed</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              {/* CardTrader */}
              <a
                href={`https://www.cardtrader.com/en/games/pokemon/sealed?q=${encodeURIComponent(set.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-lg">📦</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">CardTrader</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sealed producten</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              {/* eBay */}
              <a
                href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(set.name + ' booster box')}&LH_BIN=1&_sop=15`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-sm transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 text-lg">🏷️</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">eBay</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Booster box listings</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">💡 Sealed prijzen komen eraan</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                We werken aan automatisch ophalen van sealed box prijzen. Dan zie je hier direct de laagste prijs zonder externe site te bezoeken.
              </p>
            </div>
          </div>
        )}

        {/* SINGLES VIEW */}
        {view === 'singles' && (
          <div>
            {dealsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200 rounded-full animate-spin" />
              </div>
            ) : deals.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  Nog geen kaartdata voor <strong>{set.name}</strong> in onze database.
                </p>
                <a
                  href={cardmarketSinglesUrl(set)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  Bekijk singles op CardMarket
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{deals.length} kaarten gevonden</p>
                {deals.map(deal => (
                  <div key={deal.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{deal.product_name}</p>
                      {deal.product_set && <p className="text-xs text-gray-400 truncate">{deal.product_set}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {deal.current_price && (
                        <span className="text-sm font-bold text-gray-900 dark:text-white">€{Number(deal.current_price).toFixed(2)}</span>
                      )}
                      {deal.deal_score != null && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          deal.deal_score >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : deal.deal_score >= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {Math.round(deal.deal_score)}
                        </span>
                      )}
                      <Link
                        href={`/deals?card=${encodeURIComponent(deal.product_name)}`}
                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
                      >
                        Deals →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
