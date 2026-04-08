'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { marketApi, DealScore, Signal } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import dynamic from 'next/dynamic';
import { isSubscriberRole } from '@/lib/plans';

const PriceChart = dynamic(() => import('@/components/PriceChart'), { ssr: false });

export default function MarketPulsePage() {
  const [loading, setLoading] = useState(true);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [moversTab, setMoversTab] = useState<'buying' | 'overpriced'>('buying');
  const [userRole, setUserRole] = useState<string>('free');

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try { setUserRole(JSON.parse(raw).role || 'free'); } catch {}
    }
    loadData();
  }, []);

  const isSubscriber = isSubscriberRole(userRole);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scores, sigs] = await Promise.allSettled([
        marketApi.getDealScores({ limit: 100, min_score: 40 }),
        marketApi.getSignals({ limit: 100 }),
      ]);
      if (scores.status === 'fulfilled') setDealScores(scores.value);
      if (sigs.status === 'fulfilled') setSignals(sigs.value);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // For free users, apply the same limits as the Deals page (top 20, score ≥ 65)
  const visibleDeals = useMemo(() => {
    if (isSubscriber) return dealScores;
    return dealScores
      .filter(d => d.deal_score >= 65)
      .sort((a, b) => b.deal_score - a.deal_score)
      .slice(0, 20);
  }, [dealScores, isSubscriber]);

  const marketData = useMemo(() => {
    if (visibleDeals.length === 0) return null;

    const avgPrice = visibleDeals.reduce((sum, d) => sum + d.current_price, 0) / visibleDeals.length;
    const avgScore = visibleDeals.reduce((sum, d) => sum + d.deal_score, 0) / visibleDeals.length;

    const highScoreCount = visibleDeals.filter(d => d.deal_score >= 75).length;
    const lowScoreCount = visibleDeals.filter(d => d.deal_score < 55).length;
    const marketBias = highScoreCount > lowScoreCount ? 'bullish' : lowScoreCount > highScoreCount ? 'bearish' : 'neutral';

    const cardsWithDelta = visibleDeals
      .filter(d => d.market_avg_price && d.market_avg_price > 0)
      .map(d => ({
        ...d,
        delta: ((d.current_price - (d.market_avg_price || d.current_price)) / (d.market_avg_price || d.current_price)) * 100,
      }));

    // Buying opportunities: listed below their market average
    const buying = [...cardsWithDelta].filter(d => d.delta < 0).sort((a, b) => a.delta - b.delta);
    // Overpriced: listed above their market average
    const overpriced = [...cardsWithDelta].filter(d => d.delta > 0).sort((a, b) => b.delta - a.delta);

    const ranges = {
      under5: visibleDeals.filter(d => d.current_price < 5).length,
      range5to20: visibleDeals.filter(d => d.current_price >= 5 && d.current_price < 20).length,
      range20to50: visibleDeals.filter(d => d.current_price >= 20 && d.current_price < 50).length,
      over50: visibleDeals.filter(d => d.current_price >= 50).length,
    };

    const scoreDistribution = {
      excellent: visibleDeals.filter(d => d.deal_score >= 80).length,
      good: visibleDeals.filter(d => d.deal_score >= 65 && d.deal_score < 80).length,
      fair: visibleDeals.filter(d => d.deal_score >= 50 && d.deal_score < 65).length,
      low: visibleDeals.filter(d => d.deal_score < 50).length,
    };

    const signalBreakdown = {
      high: signals.filter(s => s.signal_level === 'high').length,
      medium: signals.filter(s => s.signal_level === 'medium').length,
      low: signals.filter(s => s.signal_level === 'low').length,
    };

    const sets = visibleDeals.reduce((acc, d) => {
      const set = d.product_set || 'Unknown';
      if (!acc[set]) acc[set] = { count: 0, totalScore: 0, totalPrice: 0 };
      acc[set].count++;
      acc[set].totalScore += d.deal_score;
      acc[set].totalPrice += d.current_price;
      return acc;
    }, {} as Record<string, { count: number; totalScore: number; totalPrice: number }>);

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
        return { label: "Buyer's market", desc: 'Most cards are priced below their market average — good time to buy', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '📈' };
      case 'bearish':
        return { label: "Seller's market", desc: 'Prices trending above market averages — be selective', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '📉' };
      default:
        return { label: 'Stable market', desc: 'Prices are largely in line with market averages', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: '➡️' };
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Market Pulse</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isSubscriber
                ? `EU market overview — ${dealScores.length} deals tracked, refreshed every hour`
                : 'EU market overview — sample based on your free plan (top 20 deals, score ≥ 65)'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500 font-medium">Hourly updated</span>
          </div>
        </div>

        {/* Free-tier notice */}
        {!loading && !isSubscriber && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Free plan:</span> stats below reflect your top-20 sample.{' '}
              Upgrade to Plus for the full catalog, all sets, and Signals.
            </p>
            <Link
              href="/pricing"
              className="ml-4 flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition"
            >
              Upgrade to Plus
            </Link>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Analysing market data...</p>
            </div>
          </div>
        ) : marketData ? (
          <>
            {/* Market Sentiment Banner */}
            {(() => {
              const config = getSentimentConfig(marketData.marketBias);
              return (
                <div className={`rounded-xl border p-5 mb-8 ${config.bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{config.icon}</span>
                      <div>
                        <h2 className={`text-lg font-bold ${config.color}`}>{config.label}</h2>
                        <p className="text-sm text-gray-600">{config.desc}</p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Based on</p>
                      <p className="text-sm font-medium text-gray-700">{marketData.totalProducts} deals{!isSubscriber && ' (sample)'}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-1">Deals tracked</p>
                <p className="text-2xl font-bold text-gray-900">{marketData.totalProducts}</p>
                {!isSubscriber && <p className="text-[10px] text-amber-600 mt-1 font-medium">Sample only</p>}
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
                        View all →
                      </Link>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-lg font-bold text-indigo-500">Plus+</p>
                    <Link href="/pricing" className="text-[10px] text-indigo-600 hover:underline font-medium">
                      Unlock →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Buying Opportunities + Price Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              {/* Movers — 3 cols */}
              <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center border-b border-gray-100">
                  <button
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
                      ? 'Cards listed below their market average — largest discount first'
                      : 'Cards listed above their market average — skip or wait for price correction'}
                  </p>
                </div>

                <div className="divide-y divide-gray-50">
                  {(moversTab === 'buying' ? marketData.buying : marketData.overpriced).slice(0, 8).map((card, i) => (
                    <div key={card.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-gray-400 w-5">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{card.product_name}</p>
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
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          card.delta < 0
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {card.delta > 0 ? '+' : ''}{card.delta.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {(moversTab === 'buying' ? marketData.buying : marketData.overpriced).length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      No data available — market avg price not recorded for these deals
                    </div>
                  )}
                </div>
              </div>

              {/* Price chart — 2 cols */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Price distribution</h3>
                <p className="text-[11px] text-gray-400 mb-4">
                  {isSubscriber ? 'All tracked deals' : 'Based on your free plan sample'}
                </p>
                <div style={{ height: '280px' }}>
                  <PriceChart deals={visibleDeals.slice(0, isSubscriber ? 100 : 20)} />
                </div>
              </div>
            </div>

            {/* Sets + Deal Quality */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Sets */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Top sets by deal count</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {isSubscriber ? 'All sets in the current deal catalog' : 'From your free-plan sample — upgrade for all sets'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {marketData.topSets.slice(0, isSubscriber ? 8 : 3).map((set, i) => (
                    <div key={set.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-gray-400 w-5">{i + 1}</span>
                        <p className="text-sm text-gray-900 truncate">{set.name}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <span className="text-xs text-gray-500">{set.count} deals</span>
                        <span className="text-xs font-medium text-gray-700">avg score {set.avgScore}</span>
                      </div>
                    </div>
                  ))}
                  {!isSubscriber && marketData.topSets.length > 3 && (
                    <div className="pt-2 border-t border-dashed border-gray-200 flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        +{marketData.topSets.length - 3} more sets visible with Plus
                      </p>
                      <Link href="/pricing" className="text-xs text-indigo-600 hover:underline font-semibold">
                        Upgrade →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Deal Quality */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Deal quality breakdown</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">How strong are the current deals?</p>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Excellent (80+)', count: marketData.scoreDistribution.excellent, color: 'bg-green-500' },
                    { label: 'Good (65–79)', count: marketData.scoreDistribution.good, color: 'bg-blue-500' },
                    { label: 'Fair (50–64)', count: marketData.scoreDistribution.fair, color: 'bg-gray-400', gated: !isSubscriber },
                    { label: 'Low (<50)', count: marketData.scoreDistribution.low, color: 'bg-gray-300', gated: !isSubscriber },
                  ].map((item) => (
                    <div key={item.label} className={item.gated ? 'opacity-40 pointer-events-none select-none' : ''}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-gray-700 flex items-center gap-1.5">
                          {item.label}
                          {item.gated && <span className="text-[9px] text-gray-400 font-semibold uppercase">Plus+</span>}
                        </span>
                        <span className="font-medium text-gray-900">{item.gated ? '—' : item.count}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full transition-all`}
                          style={{ width: item.gated ? '0%' : `${Math.max(2, (item.count / marketData.totalProducts) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Range Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Price range overview</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {isSubscriber ? 'Distribution across all tracked deals' : 'Based on your free plan sample'}
                </p>
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

            {/* Signals Summary */}
            {isSubscriber ? (
              signals.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Active signals</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Momentum, supply shifts, and set trends detected this hour</p>
                    </div>
                    <Link href="/signals" className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                      View full feed →
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-red-50">
                      <p className="text-2xl font-bold text-red-700">{marketData.signalBreakdown.high}</p>
                      <p className="text-xs font-medium text-red-600 mt-1">High priority</p>
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
                  No active signals at this time. Check back after the next hourly scan.
                </div>
              )
            ) : (
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Signals not included on Free</h3>
                    <p className="text-sm text-gray-600 mb-4 max-w-lg">
                      Momentum shifts, supply changes, set-level trends, and risk flags are detected every hour and shown in the Signals feed. Available on Plus and Business.
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      Upgrade to Plus
                    </Link>
                  </div>
                  <div className="hidden sm:flex flex-col gap-2 text-xs text-gray-500 flex-shrink-0">
                    {['Momentum signals', 'Supply shift detection', 'Set-level trend alerts', 'Email & Telegram delivery'].map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500">No market data available</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
