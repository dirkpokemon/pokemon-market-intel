'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { marketApi, MarketDigest, Signal } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
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
  const [signals, setSignals] = useState<Signal[]>([]);
  const [digest, setDigest] = useState<MarketDigest | null>(null);
  const [moversTab, setMoversTab] = useState<'buying' | 'overpriced'>('buying');
  const [userRole, setUserRole] = useState<string>('free');
  const [selectedSet, setSelectedSet] = useState('');
  const [availableSets, setAvailableSets] = useState<string[]>([]);

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
      const [scoresRes, sigsRes, digRes] = await Promise.allSettled([
        marketApi.getDealScores({
          limit: 100,
          min_score: 40,
          ...(productSet ? { product_set: productSet } : {}),
        }),
        marketApi.getSignals({ limit: 100 }),
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

      if (sigsRes.status === 'fulfilled') setSignals(sigsRes.value);
      else setSignals([]);

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

    const highScoreCount = visibleDeals.filter((d) => d.deal_score >= 75).length;
    const lowScoreCount = visibleDeals.filter((d) => d.deal_score < 55).length;
    const marketBias =
      highScoreCount > lowScoreCount ? 'bullish' : lowScoreCount > highScoreCount ? 'bearish' : 'neutral';

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

    const signalBreakdown = {
      high: signals.filter((s) => s.signal_level === 'high').length,
      medium: signals.filter((s) => s.signal_level === 'medium').length,
      low: signals.filter((s) => s.signal_level === 'low').length,
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
      marketBias,
      highScoreCount,
      lowScoreCount,
      buying: buying.slice(0, 10),
      overpriced: overpriced.slice(0, 10),
      ranges,
      scoreDistribution,
      signalBreakdown,
      topSets,
    };
  }, [visibleDeals, signals]);

  const getSentimentConfig = (bias: string) => {
    switch (bias) {
      case 'bullish':
        return {
          label: 'Buyer-friendly skew',
          desc: 'In this sample, more listings have strong deal scores (≥75) than weak ones (<55). Use the lists below to jump into deals.',
          color: 'text-green-700',
          bg: 'bg-green-50 border-green-200',
          icon: '📈',
        };
      case 'bearish':
        return {
          label: 'More weaker deals in view',
          desc: 'This sample has more low-scored listings than very strong ones — shop selectively and compare to market averages.',
          color: 'text-amber-700',
          bg: 'bg-amber-50 border-amber-200',
          icon: '📉',
        };
      default:
        return {
          label: 'Balanced mix',
          desc: 'Strong and weak deal scores are fairly balanced in this dataset.',
          color: 'text-gray-700',
          bg: 'bg-gray-50 border-gray-200',
          icon: '➡️',
        };
    }
  };

  const lastUpdated = formatDigestTime(digest?.last_analysis_at);
  const highlightSignals = (digest?.signal_highlights || []).slice(0, 3);

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Market Pulse</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isSubscriber
                ? `${dealScores.length} scored listings in this view · data refreshes hourly`
                : 'Sample view on Free (top 20 deals, score ≥ 65) — Plus uses the full scored catalog'}
            </p>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-1">Last analysis run: {lastUpdated}</p>
            )}
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 self-start">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500 font-medium">Hourly pipeline</span>
          </div>
        </div>

        {/* Value proposition */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">What this page is for</h2>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
            <li>
              <span className="font-medium text-gray-800">What you see:</span> aggregates over the scored deals in this
              view (after your plan limits). Not a full macro-economic index — a snapshot of our deal universe.
            </li>
            <li>
              <span className="font-medium text-gray-800">Why it helps:</span> spot where prices sit vs market averages,
              which sets show up most, and how deal quality is distributed — then act in Top Deals or Signals.
            </li>
            <li>
              <span className="font-medium text-gray-800">What to do next:</span> click any card or set row to open
              filtered deals; use the shortcuts below anytime.
            </li>
          </ul>
        </div>

        {/* Next steps — sticky */}
        <div className="sticky top-2 z-20 flex flex-wrap gap-2 mb-6 p-2 -mx-2 rounded-xl bg-white/95 backdrop-blur border border-gray-200 shadow-sm">
          <Link
            href="/deals"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition"
          >
            Top Deals
          </Link>
          <Link
            href="/signals"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
          >
            Signals
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
          >
            Search cards
          </Link>
          {!isSubscriber && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition"
            >
              Unlock full Pulse (Plus)
            </Link>
          )}
        </div>

        {/* Set filter */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
          <div className="flex-1 max-w-md">
            <label htmlFor="pulse-set-filter" className="block text-xs font-medium text-gray-500 mb-1">
              Focus on one set
            </label>
            <select
              id="pulse-set-filter"
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              disabled={loading && availableSets.length === 0}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-gray-300 focus:border-transparent"
            >
              <option value="">All sets (in current catalog slice)</option>
              {availableSets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Reloads scored deals for that set only. Set list comes from your last &quot;all sets&quot; load.
            </p>
          </div>
          {selectedSet && (
            <Link
              href={`/deals?set=${encodeURIComponent(selectedSet)}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
            >
              Open all deals for this set →
            </Link>
          )}
        </div>

        {!loading && !isSubscriber && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Free plan:</span> charts and counts use your sample only. Plus includes the
              full scored catalog and Signals.
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
            {(() => {
              const config = getSentimentConfig(marketData.marketBias);
              return (
                <div className={`rounded-xl border p-5 mb-8 ${config.bg}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl shrink-0">{config.icon}</span>
                      <div>
                        <h2 className={`text-lg font-bold ${config.color}`}>{config.label}</h2>
                        <p className="text-sm text-gray-600 mt-0.5">{config.desc}</p>
                        <p className="text-[11px] text-gray-500 mt-2">
                          Method: compare count of deals with score ≥75 vs &lt;55 in{' '}
                          {selectedSet ? (
                            <span className="font-medium">set &quot;{selectedSet}&quot;</span>
                          ) : (
                            'this view'
                          )}
                          . Not a prediction of the whole TCG market.
                        </p>
                      </div>
                    </div>
                    <div className="text-left lg:text-right shrink-0">
                      <p className="text-xs text-gray-500">Rows in this view</p>
                      <p className="text-sm font-medium text-gray-700">
                        {marketData.totalProducts} deals{!isSubscriber && ' (after Free cap)'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        ≥75: {marketData.highScoreCount} · &lt;55: {marketData.lowScoreCount}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                <p className="text-xs text-gray-500 font-medium mb-1">Active signals</p>
                {isSubscriber ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">{signals.length}</p>
                    {signals.length > 0 && (
                      <Link href="/signals" className="text-[10px] text-indigo-600 hover:underline font-medium">
                        View feed →
                      </Link>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-lg font-bold text-indigo-500">Plus</p>
                    <Link href="/pricing" className="text-[10px] text-indigo-600 hover:underline font-medium">
                      Unlock →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Latest signal highlights (digest) — all tiers; free → pricing on row click optional */}
            {highlightSignals.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Latest signal highlights</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      High-priority picks from the last scan — open the card or the full feed
                    </p>
                  </div>
                  {isSubscriber ? (
                    <Link href="/signals" className="text-xs text-indigo-600 hover:underline font-medium shrink-0">
                      Full Signals →
                    </Link>
                  ) : (
                    <Link href="/pricing" className="text-xs text-amber-700 hover:underline font-medium shrink-0">
                      Plus required for feed →
                    </Link>
                  )}
                </div>
                <ul className="divide-y divide-gray-100">
                  {highlightSignals.map((s) => (
                    <li key={s.id} className="py-3 first:pt-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.product_name}</p>
                          <p className="text-[11px] text-gray-500">
                            {s.signal_type.replace(/_/g, ' ')} · {s.signal_level} priority
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <Link
                            href={`/deals?card=${encodeURIComponent(s.product_name)}`}
                            className="text-xs font-semibold text-gray-700 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                          >
                            Deals for card
                          </Link>
                          {isSubscriber ? (
                            <Link
                              href="/signals"
                              className="text-xs font-semibold text-indigo-700 px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100"
                            >
                              Open Signals
                            </Link>
                          ) : (
                            <Link
                              href="/pricing"
                              className="text-xs font-semibold text-amber-800 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100"
                            >
                              Upgrade for feed
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                    {moversTab === 'buying'
                      ? 'Listed below market average — largest gap first. Row opens filtered Top Deals for that card.'
                      : 'Listed above market average. Row opens Top Deals for that card.'}
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
                        <span className="text-[10px] text-gray-400 hidden sm:inline">View →</span>
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
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Price distribution</h3>
                <p className="text-[11px] text-gray-400 mb-4">
                  {isSubscriber ? 'Deals in this view' : 'Your Free sample'}
                </p>
                <div style={{ height: isSubscriber ? '280px' : '200px' }}>
                  <PriceChart deals={visibleDeals.slice(0, isSubscriber ? 100 : 20)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Top sets in this view</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      By number of scored deals here — click a set to open Top Deals filtered
                    </p>
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
                    <h3 className="text-sm font-semibold text-gray-900">Deal quality breakdown</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Share of deals by AI score band</p>
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
                <div className="bg-gradient-to-br from-gray-50 to-slate-100 border border-gray-200 rounded-xl p-5 flex flex-col justify-center">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Deal quality breakdown</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Full score bands (including fair and weak deals) and accurate shares are on Plus, where the whole
                    scored catalog feeds this chart.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex w-fit items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 text-xs font-semibold hover:bg-gray-800"
                  >
                    See Plus details
                  </Link>
                </div>
              )}
            </div>

            {/* Set momentum from digest — broader than deal slice */}
            {(digest?.top_rising_sets?.length || digest?.top_declining_sets?.length) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Sets rising (7d trend)</h3>
                  <p className="text-[11px] text-gray-400 mb-3">From market stats — avg price trend across cards in each set</p>
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
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Sets declining (7d trend)</h3>
                  <p className="text-[11px] text-gray-400 mb-3">Same methodology — useful for timing buys</p>
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
                  <h3 className="text-sm font-semibold text-gray-900">Price range overview</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">How listings in this view spread across price buckets</p>
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

            {isSubscriber ? (
              signals.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Signal priority mix</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">All active signals in your feed this hour</p>
                    </div>
                    <Link href="/signals" className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                      View full feed →
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-red-50">
                      <p className="text-2xl font-bold text-red-700">{marketData.signalBreakdown.high}</p>
                      <p className="text-xs font-medium text-red-600 mt-1">High</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-amber-50">
                      <p className="text-2xl font-bold text-amber-700">{marketData.signalBreakdown.medium}</p>
                      <p className="text-xs font-medium text-amber-600 mt-1">Medium</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-50">
                      <p className="text-2xl font-bold text-blue-700">{marketData.signalBreakdown.low}</p>
                      <p className="text-xs font-medium text-blue-600 mt-1">Low</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center text-sm text-gray-500">
                  No active signals right now. Try again after the next hourly scan.
                </div>
              )
            ) : (
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Full Signals feed is Plus</h3>
                    <p className="text-sm text-gray-600 mb-4 max-w-lg">
                      Momentum, supply, set trends, and risk flags update hourly. Highlights above show a preview; the live
                      feed needs Plus.
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      Upgrade to Plus
                    </Link>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-2 shrink-0">
                    {['Momentum & price drop', 'Supply shifts', 'Set-level trends', 'Email & Telegram'].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
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
