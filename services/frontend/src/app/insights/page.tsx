'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { marketApi, DealScore, MarketDigest } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import MarketPulseAssistant from '@/components/MarketPulseAssistant';
import dynamic from 'next/dynamic';
import { isSubscriberRole } from '@/lib/plans';

const PriceChart = dynamic(() => import('@/components/PriceChart'), { ssr: false });

function formatDigestTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

export default function MarketPulsePage() {
  const [loading, setLoading] = useState(true);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [digest, setDigest] = useState<MarketDigest | null>(null);
  const [moversTab, setMoversTab] = useState<'buying' | 'overpriced'>('buying');
  const [userRole, setUserRole] = useState<string>('free');
  const [selectedSet, setSelectedSet] = useState('');
  const [availableSets, setAvailableSets] = useState<string[]>([]);
  const [mobilePulseTab, setMobilePulseTab] = useState<'overview' | 'pulse'>('overview');

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setUserRole(JSON.parse(raw).role || 'free');
      } catch {
        /* keep free */
      }
    }
  }, []);

  const isSubscriber = isSubscriberRole(userRole);

  const loadData = useCallback(async (setFilter: string) => {
    const trimmed = setFilter.trim();
    const productSet = trimmed || undefined;
    try {
      setLoading(true);
      const [scoresRes, digRes] = await Promise.allSettled([
        marketApi.getDealScores({
          limit: 100,
          min_score: 40,
          ...(productSet ? { product_set: productSet } : {}),
        }),
        marketApi.getMarketDigest(),
      ]);

      if (scoresRes.status === 'fulfilled') {
        setDealScores(scoresRes.value);
        if (!productSet) {
          const names = scoresRes.value
            .map((d) => d.product_set)
            .filter((s): s is string => Boolean(s && s !== 'Unknown'));
          const uniq = [...new Set(names)].sort((a, b) => a.localeCompare(b));
          setAvailableSets(uniq);
        }
      } else {
        setDealScores([]);
      }

      if (digRes.status === 'fulfilled') setDigest(digRes.value);
      else setDigest(null);
    } catch (err) {
      console.error('Error loading market pulse:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedSet);
  }, [selectedSet, loadData]);

  const visibleDeals = useMemo(() => {
    if (isSubscriber) return dealScores;
    return dealScores
      .filter((d) => d.deal_score >= 65)
      .sort((a, b) => b.deal_score - a.deal_score)
      .slice(0, 20);
  }, [dealScores, isSubscriber]);

  const marketData = useMemo(() => {
    if (visibleDeals.length === 0) return null;

    const avgPrice = visibleDeals.reduce((sum, d) => sum + d.current_price, 0) / visibleDeals.length;
    const avgScore = visibleDeals.reduce((sum, d) => sum + d.deal_score, 0) / visibleDeals.length;

    const cardsWithDelta = visibleDeals
      .filter((d) => d.market_avg_price && d.market_avg_price > 0)
      .map((d) => ({
        ...d,
        delta:
          ((d.current_price - (d.market_avg_price || d.current_price)) / (d.market_avg_price || d.current_price)) * 100,
      }));

    const buying = [...cardsWithDelta].filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta);
    const overpriced = [...cardsWithDelta].filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta);

    const ranges = {
      under5: visibleDeals.filter((d) => d.current_price < 5).length,
      range5to20: visibleDeals.filter((d) => d.current_price >= 5 && d.current_price < 20).length,
      range20to50: visibleDeals.filter((d) => d.current_price >= 20 && d.current_price < 50).length,
      over50: visibleDeals.filter((d) => d.current_price >= 50).length,
    };

    const scoreDistribution = {
      excellent: visibleDeals.filter((d) => d.deal_score >= 80).length,
      good: visibleDeals.filter((d) => d.deal_score >= 65 && d.deal_score < 80).length,
      fair: visibleDeals.filter((d) => d.deal_score >= 50 && d.deal_score < 65).length,
      low: visibleDeals.filter((d) => d.deal_score < 50).length,
    };

    const sets = visibleDeals.reduce(
      (acc, d) => {
        const set = d.product_set || 'Unknown';
        if (!acc[set]) acc[set] = { count: 0, totalScore: 0, totalPrice: 0 };
        acc[set].count++;
        acc[set].totalScore += d.deal_score;
        acc[set].totalPrice += d.current_price;
        return acc;
      },
      {} as Record<string, { count: number; totalScore: number; totalPrice: number }>
    );

    const topSets = Object.entries(sets)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
        avgPrice: data.totalPrice / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      avgPrice,
      avgScore: Math.round(avgScore),
      totalProducts: visibleDeals.length,
      buying: buying.slice(0, 10),
      overpriced: overpriced.slice(0, 10),
      ranges,
      scoreDistribution,
      topSets,
    };
  }, [visibleDeals]);

  const lastUpdated = formatDigestTime(digest?.last_analysis_at);

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Market Pulse</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSubscriber
              ? `${dealScores.length} listings · hourly refresh${lastUpdated ? ` · ${lastUpdated}` : ''}`
              : `Free sample (top 20, score ≥65)${lastUpdated ? ` · ${lastUpdated}` : ''}`}
          </p>
        </div>

        {/* Set filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
            <label htmlFor="pulse-set-filter" className="text-xs font-medium text-gray-500 shrink-0 sm:w-20">
              Set
            </label>
            <select
              id="pulse-set-filter"
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              disabled={loading && availableSets.length === 0}
              className="flex-1 max-w-md px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-gray-300 focus:border-transparent"
            >
              <option value="">All sets</option>
              {availableSets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {selectedSet ? (
            <Link
              href={`/deals?set=${encodeURIComponent(selectedSet)}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap shrink-0"
            >
              Open in Deals →
            </Link>
          ) : null}
        </div>

        {!loading && !isSubscriber && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
            <p className="text-xs text-amber-900">
              Free: beperkte steekproef — <span className="font-medium">Plus</span> gebruikt de volledige gescoorde catalogus voor deze grafieken.
            </p>
            <Link
              href="/pricing"
              className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition text-center"
            >
              Upgrade to Plus
            </Link>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading market pulse…</p>
            </div>
          </div>
        ) : marketData ? (
          <>
            <div
              className="flex md:hidden gap-1 p-1 bg-gray-100 rounded-xl mb-5"
              role="tablist"
              aria-label="Market Pulse weergave"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mobilePulseTab === 'overview'}
                onClick={() => setMobilePulseTab('overview')}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition ${
                  mobilePulseTab === 'overview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overzicht
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobilePulseTab === 'pulse'}
                onClick={() => setMobilePulseTab('pulse')}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition ${
                  mobilePulseTab === 'pulse'
                    ? 'bg-white text-indigo-800 shadow-sm ring-1 ring-indigo-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pulse
              </button>
            </div>

            <div className="lg:flex lg:gap-8 lg:items-start">
              <div
                className={
                  mobilePulseTab === 'pulse' ? 'hidden lg:block lg:flex-1 min-w-0' : 'lg:flex-1 min-w-0'
                }
              >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-1">Deals in view</p>
                <p className="text-2xl font-bold text-gray-900">{marketData.totalProducts}</p>
                {!isSubscriber && <p className="text-[10px] text-amber-600 mt-1 font-medium">Free sample cap</p>}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-1">Avg listing price</p>
                <p className="text-2xl font-bold text-gray-900">€{marketData.avgPrice.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-1">Avg deal score</p>
                <p className="text-2xl font-bold text-gray-900">{marketData.avgScore}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-1">Sets in catalog</p>
                <p className="text-2xl font-bold text-gray-900">
                  {digest?.total_sets != null ? digest.total_sets.toLocaleString() : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Distinct sets in EU scrape</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => setMoversTab('buying')}
                    className={`flex-1 px-5 py-3.5 text-sm font-medium transition border-b-2 ${
                      moversTab === 'buying'
                        ? 'border-green-600 text-green-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-1.5">📈</span> Buying opportunities
                    <span className="ml-2 text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                      {marketData.buying.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoversTab('overpriced')}
                    className={`flex-1 px-5 py-3.5 text-sm font-medium transition border-b-2 ${
                      moversTab === 'overpriced'
                        ? 'border-amber-600 text-amber-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-1.5">⚠️</span> Overpriced
                    <span className="ml-2 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                      {marketData.overpriced.length}
                    </span>
                  </button>
                </div>

                <div className="px-5 pt-2 pb-1">
                  <p className="text-[11px] text-gray-400">
                    {moversTab === 'buying' ? 'Below market avg · tap row for Deals' : 'Above market avg · tap row for Deals'}
                  </p>
                </div>

                <div className="divide-y divide-gray-50">
                  {(moversTab === 'buying' ? marketData.buying : marketData.overpriced).slice(0, 8).map((card, i) => (
                    <Link
                      key={card.id}
                      href={`/deals?card=${encodeURIComponent(card.product_name)}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-gray-400 w-5">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700">
                            {card.product_name}
                          </p>
                          {card.product_set && (
                            <p className="text-xs text-gray-400 truncate">{card.product_set}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">€{card.current_price.toFixed(2)}</p>
                          {card.market_avg_price && (
                            <p className="text-[10px] text-gray-400">avg €{card.market_avg_price.toFixed(2)}</p>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            card.delta < 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {card.delta > 0 ? '+' : ''}
                          {card.delta.toFixed(1)}%
                        </span>
                      </div>
                    </Link>
                  ))}
                  {(moversTab === 'buying' ? marketData.buying : marketData.overpriced).length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      No rows — market average missing for these deals, or nothing matches this tab.
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Price spread</h3>
                <div style={{ height: isSubscriber ? '280px' : '200px' }}>
                  <PriceChart deals={visibleDeals.slice(0, isSubscriber ? 100 : 20)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Top sets</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">By deal count in this view</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {marketData.topSets.slice(0, isSubscriber ? 8 : 3).map((set, i) => (
                    <div key={set.name} className="flex items-center justify-between gap-2 rounded-lg hover:bg-gray-50 px-1 py-1.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-gray-400 w-5">{i + 1}</span>
                        {set.name !== 'Unknown' ? (
                          <Link
                            href={`/deals?set=${encodeURIComponent(set.name)}`}
                            className="text-sm text-indigo-700 font-medium truncate hover:underline"
                          >
                            {set.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-500 truncate">{set.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-600">
                        <span>{set.count} deals</span>
                        <span className="font-medium">avg {set.avgScore}</span>
                      </div>
                    </div>
                  ))}
                  {!isSubscriber && marketData.topSets.length > 3 && (
                    <div className="pt-2 border-t border-dashed border-gray-200 flex items-center justify-between">
                      <p className="text-xs text-gray-400">+{marketData.topSets.length - 3} more rows on Plus</p>
                      <Link href="/pricing" className="text-xs text-indigo-600 hover:underline font-semibold">
                        Upgrade →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {isSubscriber ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Score mix</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">By deal score band</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Excellent (80+)', count: marketData.scoreDistribution.excellent, color: 'bg-green-500' },
                      { label: 'Good (65–79)', count: marketData.scoreDistribution.good, color: 'bg-blue-500' },
                      { label: 'Fair (50–64)', count: marketData.scoreDistribution.fair, color: 'bg-gray-400' },
                      { label: 'Low (<50)', count: marketData.scoreDistribution.low, color: 'bg-gray-300' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-gray-700">{item.label}</span>
                          <span className="font-medium text-gray-900">{item.count}</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-2">
                          <div
                            className={`${item.color} h-2 rounded-full transition-all`}
                            style={{
                              width: `${Math.max(2, (item.count / marketData.totalProducts) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-slate-100 border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Score mix</h3>
                  <p className="text-xs text-gray-600 mb-3">Full breakdown on Plus.</p>
                  <Link
                    href="/pricing"
                    className="inline-flex w-fit rounded-lg bg-gray-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-800"
                  >
                    Plus
                  </Link>
                </div>
              )}
            </div>

            {/* Set momentum from digest — broader than deal slice */}
            {(digest?.top_rising_sets?.length || digest?.top_declining_sets?.length) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sets ↑ (7d)</h3>
                  <ul className="space-y-2">
                    {(digest?.top_rising_sets || []).slice(0, 5).map((t) => (
                      <li key={t.product_set} className="flex items-center justify-between text-sm">
                        <Link
                          href={`/deals?set=${encodeURIComponent(t.product_set)}`}
                          className="text-indigo-700 font-medium truncate hover:underline min-w-0 pr-2"
                        >
                          {t.product_set}
                        </Link>
                        <span className="text-green-700 font-semibold shrink-0">+{t.avg_trend}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sets ↓ (7d)</h3>
                  <ul className="space-y-2">
                    {(digest?.top_declining_sets || []).slice(0, 5).map((t) => (
                      <li key={t.product_set} className="flex items-center justify-between text-sm">
                        <Link
                          href={`/deals?set=${encodeURIComponent(t.product_set)}`}
                          className="text-indigo-700 font-medium truncate hover:underline min-w-0 pr-2"
                        >
                          {t.product_set}
                        </Link>
                        <span className="text-rose-700 font-semibold shrink-0">{t.avg_trend}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {isSubscriber && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Price buckets</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">This view</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Under €5', count: marketData.ranges.under5, color: 'bg-green-100 text-green-800' },
                    { label: '€5 – €20', count: marketData.ranges.range5to20, color: 'bg-blue-100 text-blue-800' },
                    { label: '€20 – €50', count: marketData.ranges.range20to50, color: 'bg-purple-100 text-purple-800' },
                    { label: 'Over €50', count: marketData.ranges.over50, color: 'bg-gray-100 text-gray-800' },
                  ].map((range) => (
                    <div key={range.label} className="text-center p-4 rounded-lg bg-gray-50">
                      <p className="text-2xl font-bold text-gray-900">{range.count}</p>
                      <p className={`text-xs font-medium mt-1 inline-block px-2 py-0.5 rounded ${range.color}`}>
                        {range.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {marketData.totalProducts > 0
                          ? `${Math.round((range.count / marketData.totalProducts) * 100)}%`
                          : '0%'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </div>

              <aside
                className={
                  mobilePulseTab === 'overview'
                    ? 'hidden lg:block shrink-0 w-full lg:w-[380px] lg:sticky lg:top-24 lg:self-start'
                    : 'shrink-0 w-full lg:w-[380px] lg:sticky lg:top-24 lg:self-start'
                }
              >
                <MarketPulseAssistant
                  marketData={marketData}
                  visibleDeals={visibleDeals}
                  digest={digest}
                  isSubscriber={isSubscriber}
                  lastUpdatedLine={lastUpdated}
                  selectedSetLabel={selectedSet}
                />
              </aside>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No market data for this filter.</p>
            {selectedSet && (
              <button
                type="button"
                onClick={() => setSelectedSet('')}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Clear set filter
              </button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
