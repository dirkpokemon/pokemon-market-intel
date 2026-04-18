'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { findSetById, cardmarketSealedUrl, cardmarketSinglesUrl, setLogoUrl } from '@/lib/pokemon-sets';
import { marketApi, sealedApi, DealScore, SealedPrice } from '@/lib/api';

type View = 'sealed' | 'singles';

const SOURCE_STYLE: Record<string, { bg: string; label: string }> = {
  'CardTrader': { bg: 'bg-gray-800 text-gray-200', label: 'CardTrader' },
  'CardMarket': { bg: 'bg-blue-900/60 text-blue-200', label: 'CardMarket' },
  'eBay':       { bg: 'bg-amber-900/60 text-amber-200', label: 'eBay' },
};

// Group sealed prices by product name
function groupByProduct(prices: SealedPrice[]): Map<string, SealedPrice[]> {
  const map = new Map<string, SealedPrice[]>();
  for (const p of prices) {
    const key = p.product_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

function timeAgo(iso?: string) {
  if (!iso) return null;
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SetDetailPage({ params }: { params: { setId: string } }) {
  const { setId } = params;
  const set = findSetById(setId);
  const logoUrl = set ? setLogoUrl(set) : null;

  const [view, setView] = useState<View>('sealed');
  const [deals, setDeals] = useState<DealScore[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [sealedPrices, setSealedPrices] = useState<SealedPrice[]>([]);
  const [sealedLoading, setSealedLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Load sealed prices on mount
  useEffect(() => {
    if (!set) return;
    setSealedLoading(true);
    sealedApi.getPrices(set.name)
      .then(setSealedPrices)
      .catch(() => setSealedPrices([]))
      .finally(() => setSealedLoading(false));
  }, [set]);

  // Load singles on tab switch
  useEffect(() => {
    if (view === 'singles' && set && deals.length === 0) {
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

  const grouped = groupByProduct(sealedPrices);
  const hasLiveData = sealedPrices.length > 0;

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1200px] mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/sets" className="hover:text-gray-700 dark:hover:text-gray-200">Sets</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{set.name}</span>
        </div>

        {/* Header: logo + title */}
        <div className="flex items-center gap-5 mb-6">
          {logoUrl && !logoError ? (
            <div className="flex-shrink-0 w-32 h-16 flex items-center">
              <Image
                src={logoUrl}
                alt={set.name}
                width={160}
                height={64}
                unoptimized
                onError={() => setLogoError(true)}
                className="object-contain max-h-16 w-auto drop-shadow"
              />
            </div>
          ) : null}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{set.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{set.era.replace(/-/g, ' ')}</p>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800/80 mb-6">
          {(['sealed', 'singles'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                view === v
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {v === 'sealed' ? '📦 Sealed product' : '🃏 Losse kaarten'}
            </button>
          ))}
        </div>

        {/* ── SEALED VIEW ── */}
        {view === 'sealed' && (
          <div className="space-y-6">

            {sealedLoading ? (
              /* Loading skeleton */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : hasLiveData ? (
              <>
                {/* Live price cards grouped by product */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                      Live sealed prijzen — CardTrader
                    </p>
                    <span className="text-xs text-gray-400">
                      · {sealedPrices[0]?.last_seen ? `Bijgewerkt ${timeAgo(sealedPrices[0].last_seen)}` : 'Vers data'}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from(grouped.entries()).map(([productName, rows]) => {
                      const minPrice = Math.min(...rows.map(r => r.min_price));
                      const avgPrice = rows.reduce((s, r) => s + r.avg_price, 0) / rows.length;
                      const totalListings = rows.reduce((s, r) => s + r.listing_count, 0);
                      const sourceRow = rows[0];

                      return (
                        <div key={productName} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-snug">
                            {productName}
                          </p>
                          <div className="flex items-end justify-between mb-3">
                            <div>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">€{minPrice.toFixed(2)}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                vanaf · gem. €{avgPrice.toFixed(2)}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400">{totalListings} listings</span>
                          </div>
                          {sourceRow.source_url && (
                            <a
                              href={sourceRow.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                            >
                              Bekijken op {sourceRow.source}
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Still show external links below */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide font-medium">Vergelijk ook op</p>
                  <div className="flex flex-wrap gap-3">
                    <a href={cardmarketSealedUrl(set)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition">
                      🛒 CardMarket
                    </a>
                    <a href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(set.name + ' booster box')}&LH_BIN=1&_sop=15`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-amber-400 dark:hover:border-amber-600 hover:text-amber-600 dark:hover:text-amber-400 transition">
                      🏷️ eBay
                    </a>
                  </div>
                </div>
              </>
            ) : (
              /* No live data yet — show external links */
              <>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-xl">🔄</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Sealed prijzen worden verzameld</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        De scraper haalt dagelijks sealed product prijzen op van CardTrader. Als deze set beschikbaar is bij CardTrader, verschijnen ze hier automatisch.
                      </p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <a href={cardmarketSealedUrl(set)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-600 transition group">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm flex-shrink-0">🛒</div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">CardMarket</p>
                        <p className="text-[10px] text-gray-400 truncate">Booster boxes &amp; sealed</p>
                      </div>
                    </a>
                    <a href={`https://www.cardtrader.com/en/games/pokemon/sealed?q=${encodeURIComponent(set.name)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition group">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">📦</div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">CardTrader</p>
                        <p className="text-[10px] text-gray-400 truncate">Sealed producten</p>
                      </div>
                    </a>
                    <a href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(set.name + ' booster box')}&LH_BIN=1&_sop=15`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-amber-400 dark:hover:border-amber-600 transition group">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-sm flex-shrink-0">🏷️</div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">eBay</p>
                        <p className="text-[10px] text-gray-400 truncate">Booster box listings</p>
                      </div>
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SINGLES VIEW ── */}
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
                <a href={cardmarketSinglesUrl(set)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
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
                      <Link href={`/deals?card=${encodeURIComponent(deal.product_name)}`}
                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium">
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
