'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import CardImage from '@/components/CardImage';
import { marketApi, sealedApi, setsApi, DealScore, SealedPrice, PokemonSetInfo } from '@/lib/api';
import Sparkline from '@/components/Sparkline';

function cardmarketSealedUrl(set: PokemonSetInfo): string {
  return `https://www.cardmarket.com/en/Pokemon/Products/Booster-Boxes?searchString=${encodeURIComponent(set.name)}&sortBy=price_asc`;
}

function cardmarketSinglesUrl(set: PokemonSetInfo): string {
  return `https://www.cardmarket.com/en/Pokemon/Products/Singles?searchString=${encodeURIComponent(set.name)}&sortBy=price_asc`;
}

type View = 'singles' | 'sealed';
type SortKey = 'score-desc' | 'price-asc' | 'price-desc' | 'savings-desc';

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
  if (h < 1) return 'zojuist';
  if (h < 24) return `${h}u geleden`;
  return `${Math.floor(h / 24)}d geleden`;
}

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (score >= 65) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
}

function DealCard({ deal, sparkline }: { deal: DealScore; sparkline?: number[] }) {
  const savings = deal.market_avg_price && deal.market_avg_price > deal.current_price
    ? Math.round((1 - deal.current_price / deal.market_avg_price) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition hover:shadow-sm overflow-hidden flex flex-col">
      {/* Image area */}
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center py-4 px-3">
        <CardImage cardName={deal.product_name} size="lg" />
        {savings >= 5 && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-md">
            -{savings}%
          </div>
        )}
        <div className={`absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${scoreColor(deal.deal_score)}`}>
          {deal.deal_score}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-auto">
          {deal.product_name}
        </h3>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">€{deal.current_price.toFixed(2)}</p>
            {deal.market_avg_price && deal.market_avg_price > deal.current_price && (
              <p className="text-[10px] text-gray-400 line-through">€{deal.market_avg_price.toFixed(2)}</p>
            )}
          </div>
          {sparkline && sparkline.length >= 2 ? (
            <Sparkline data={sparkline} width={64} height={22} showChange />
          ) : (
            <Link
              href={`/deals`}
              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex-shrink-0"
            >
              Deals →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetDetailClient({ params }: { params: { setId: string } }) {
  const { setId } = params;  // canonical slug from URL

  const [set, setSet] = useState<PokemonSetInfo | null>(null);
  const [setLoading, setSetLoading] = useState(true);
  const [view, setView] = useState<View>('singles');
  const [deals, setDeals] = useState<DealScore[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsLoaded, setDealsLoaded] = useState(false);
  const [sealedPrices, setSealedPrices] = useState<SealedPrice[]>([]);
  const [sealedLoading, setSealedLoading] = useState(false);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('score-desc');

  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    const title = set?.name ?? 'TCG Pulse';
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  // Resolve slug → set metadata via registry API (single source of truth).
  // Also reset all data state so navigating between sets never shows stale deals/prices.
  useEffect(() => {
    setSet(null);
    setDeals([]);
    setDealsLoaded(false);
    setSealedPrices([]);
    setSparklines({});
    setsApi.list(false)
      .then(res => {
        const found = res.sets.find(s => s.slug === setId) || null;
        setSet(found);
      })
      .catch(() => setSet(null))
      .finally(() => setSetLoading(false));
  }, [setId]);

  // Load singles on mount (default tab) — query by canonical slug
  useEffect(() => {
    if (!set || dealsLoaded) return;
    setDealsLoading(true);
    marketApi.getDealScores({ limit: 100, set_slug: set.slug })
      .then(d => {
        setDeals(d);
        setDealsLoaded(true);
        // Fire batch sparkline request for all loaded cards
        if (d.length > 0) {
          marketApi.getSparklines(d.map(x => x.product_name), 7)
            .then(setSparklines)
            .catch(() => {});
        }
      })
      .catch(() => { setDeals([]); setDealsLoaded(true); })
      .finally(() => setDealsLoading(false));
  }, [set, dealsLoaded]);

  // Load sealed prices when switching to sealed tab
  useEffect(() => {
    if (view !== 'sealed' || !set || sealedPrices.length > 0) return;
    setSealedLoading(true);
    sealedApi.getPrices(set.slug)
      .then(setSealedPrices)
      .catch(() => setSealedPrices([]))
      .finally(() => setSealedLoading(false));
  }, [view, set, sealedPrices.length]);

  const filteredDeals = useMemo(() => {
    let list = deals.filter(d =>
      !search || d.product_name.toLowerCase().includes(search.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.current_price - b.current_price;
      if (sortBy === 'price-desc') return b.current_price - a.current_price;
      if (sortBy === 'savings-desc') {
        const savA = a.market_avg_price ? (1 - a.current_price / a.market_avg_price) : 0;
        const savB = b.market_avg_price ? (1 - b.current_price / b.market_avg_price) : 0;
        return savB - savA;
      }
      return b.deal_score - a.deal_score;
    });
    return list;
  }, [deals, search, sortBy]);

  const stats = useMemo(() => {
    if (!deals.length) return null;
    const best = Math.max(...deals.map(d => d.deal_score));
    const cheapest = Math.min(...deals.map(d => d.current_price));
    const withSavings = deals.filter(d => d.market_avg_price && d.market_avg_price > d.current_price).length;
    return { best, cheapest, withSavings, total: deals.length };
  }, [deals]);

  if (setLoading) {
    return (
      <DashboardLayout>
        <div className="px-6 py-12 text-center">
          <p className="text-gray-400 text-sm animate-pulse">Set laden…</p>
        </div>
      </DashboardLayout>
    );
  }

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
  const hasLiveSealed = sealedPrices.length > 0;
  const cheapestSealed = hasLiveSealed ? Math.min(...sealedPrices.map(p => p.min_price)) : null;

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1200px] mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/sets" className="hover:text-gray-700 dark:hover:text-gray-200 transition">Sets</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{set.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-5 mb-6">
          {set.set_code && (
            <div className="flex-shrink-0 w-14 h-14 hidden sm:flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-xs font-black tracking-wide text-gray-500 dark:text-gray-400 uppercase">{set.set_code}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{set.name}</h1>
              <button
                onClick={handleShare}
                title="Deel deze pagina"
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                {shared ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-500">Gekopieerd!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Deel
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{set.era.replace(/-/g, ' ')}</p>
          </div>
        </div>

        {/* KPI strip */}
        {(stats || cheapestSealed) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {stats && (
              <>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">Singles gevolgd</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">Beste deal score</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.best}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">Goedkoopste single</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">€{stats.cheapest.toFixed(2)}</p>
                </div>
              </>
            )}
            {cheapestSealed && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">Sealed v.a.</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">€{cheapestSealed.toFixed(0)}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab toggle */}
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800/80 mb-6">
          {(['singles', 'sealed'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                view === v
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {v === 'sealed' ? '📦 Sealed' : '🃏 Losse kaarten'}
              {v === 'singles' && stats && (
                <span className="ml-2 text-[10px] bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded font-medium">{stats.total}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── SINGLES VIEW ── */}
        {view === 'singles' && (
          <>
            {dealsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse">
                    <div className="h-28 bg-gray-100 dark:bg-gray-800" />
                    <div className="p-3">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : deals.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🃏</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Nog geen kaartdata</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 max-w-xs mx-auto">
                  Onze scraper heeft nog geen singles voor <strong>{set.name}</strong> gedetecteerd. Bekijk ze direct op CardMarket.
                </p>
                <a
                  href={cardmarketSinglesUrl(set)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  Bekijk singles op CardMarket
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ) : (
              <>
                {/* Search + sort */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                  <div className="relative flex-1">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Zoek een kaart…"
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortKey)}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
                  >
                    <option value="score-desc">Beste score</option>
                    <option value="savings-desc">Meeste besparing</option>
                    <option value="price-asc">Laagste prijs</option>
                    <option value="price-desc">Hoogste prijs</option>
                  </select>
                </div>

                {filteredDeals.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Geen resultaten voor &ldquo;{search}&rdquo;</p>
                    <button onClick={() => setSearch('')} className="mt-2 text-xs text-emerald-600 hover:underline">Wis zoekopdracht</button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                      {filteredDeals.length} kaart{filteredDeals.length !== 1 ? 'en' : ''}{search ? ` voor "${search}"` : ''}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {filteredDeals.map(deal => (
                        <DealCard key={deal.id} deal={deal} sparkline={sparklines[deal.product_name]} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── SEALED VIEW ── */}
        {view === 'sealed' && (
          <div className="space-y-6">
            {sealedLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : hasLiveSealed ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                      Live sealed prijzen
                    </p>
                    {sealedPrices[0]?.last_seen && (
                      <span className="text-xs text-gray-400">
                        · Bijgewerkt {timeAgo(sealedPrices[0].last_seen)}
                      </span>
                    )}
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
                                v.a. · gem. €{avgPrice.toFixed(2)}
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
                              Bekijk op {sourceRow.source}
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
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-xl">🔄</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Sealed prijzen worden verzameld</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      De scraper haalt dagelijks sealed product prijzen op van CardTrader. Zodra er data beschikbaar is, verschijnt het hier automatisch.
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <a href={cardmarketSealedUrl(set)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-600 transition group">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm flex-shrink-0">🛒</div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">CardMarket</p>
                      <p className="text-[10px] text-gray-400">Booster boxes &amp; sealed</p>
                    </div>
                  </a>
                  <a href={`https://www.cardtrader.com/en/games/pokemon/sealed?q=${encodeURIComponent(set.name)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition group">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">📦</div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">CardTrader</p>
                      <p className="text-[10px] text-gray-400">Sealed producten</p>
                    </div>
                  </a>
                  <a href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(set.name + ' booster box')}&LH_BIN=1&_sop=15`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-amber-400 dark:hover:border-amber-600 transition group">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-sm flex-shrink-0">🏷️</div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">eBay</p>
                      <p className="text-[10px] text-gray-400">Booster box listings</p>
                    </div>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
