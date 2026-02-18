'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { marketApi, DealScore, Signal } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import dynamic from 'next/dynamic';

const PriceChart = dynamic(() => import('@/components/PriceChart'), { ssr: false });

export default function MarketPulsePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [moversTab, setMoversTab] = useState<'rising' | 'falling'>('rising');

  useEffect(() => {
    loadData();
  }, []);

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

  // Derived market data
  const marketData = useMemo(() => {
    if (dealScores.length === 0) return null;

    const avgPrice = dealScores.reduce((sum, d) => sum + d.current_price, 0) / dealScores.length;
    const avgScore = dealScores.reduce((sum, d) => sum + d.deal_score, 0) / dealScores.length;
    
    // Simulate price change based on deal scores — in production, compare to historical data
    const highScoreCount = dealScores.filter(d => d.deal_score >= 75).length;
    const lowScoreCount = dealScores.filter(d => d.deal_score < 55).length;
    const marketBias = highScoreCount > lowScoreCount ? 'bullish' : lowScoreCount > highScoreCount ? 'bearish' : 'neutral';
    
    // Cards with market avg comparison (simulate movers)
    const cardsWithDelta = dealScores
      .filter(d => d.market_avg_price && d.market_avg_price > 0)
      .map(d => ({
        ...d,
        delta: ((d.current_price - (d.market_avg_price || d.current_price)) / (d.market_avg_price || d.current_price)) * 100,
      }));

    const rising = [...cardsWithDelta].filter(d => d.delta < 0).sort((a, b) => a.delta - b.delta); // Below avg = buying opportunity
    const falling = [...cardsWithDelta].filter(d => d.delta > 0).sort((a, b) => b.delta - a.delta); // Above avg = overpriced
    
    // Price ranges
    const ranges = {
      under5: dealScores.filter(d => d.current_price < 5).length,
      range5to20: dealScores.filter(d => d.current_price >= 5 && d.current_price < 20).length,
      range20to50: dealScores.filter(d => d.current_price >= 20 && d.current_price < 50).length,
      over50: dealScores.filter(d => d.current_price >= 50).length,
    };

    // Score distribution
    const scoreDistribution = {
      excellent: dealScores.filter(d => d.deal_score >= 80).length,
      good: dealScores.filter(d => d.deal_score >= 65 && d.deal_score < 80).length,
      fair: dealScores.filter(d => d.deal_score >= 50 && d.deal_score < 65).length,
      low: dealScores.filter(d => d.deal_score < 50).length,
    };

    // Signal breakdown
    const signalBreakdown = {
      high: signals.filter(s => s.signal_level === 'high').length,
      medium: signals.filter(s => s.signal_level === 'medium').length,
      low: signals.filter(s => s.signal_level === 'low').length,
    };

    // Unique sets
    const sets = dealScores.reduce((acc, d) => {
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
      totalProducts: dealScores.length,
      marketBias,
      rising: rising.slice(0, 10),
      falling: falling.slice(0, 10),
      ranges,
      scoreDistribution,
      signalBreakdown,
      topSets,
    };
  }, [dealScores, signals]);

  const getSentimentConfig = (bias: string) => {
    switch (bias) {
      case 'bullish':
        return { label: 'Buyer\'s Market', desc: 'Many cards priced below market average', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '📈' };
      case 'bearish':
        return { label: 'Seller\'s Market', desc: 'Prices trending above market averages', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '📉' };
      default:
        return { label: 'Stable Market', desc: 'Prices in line with market averages', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: '➡️' };
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Market Pulse</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time overview of the EU Pokémon TCG market</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading market data...</p>
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
                      <p className="text-xs text-gray-500">Last updated</p>
                      <p className="text-sm font-medium text-gray-700">{new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-1">Products Tracked</p>
                <p className="text-2xl font-bold text-gray-900">{marketData.totalProducts.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-1">Avg Price</p>
                <p className="text-2xl font-bold text-gray-900">€{marketData.avgPrice.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-1">Avg Deal Score</p>
                <p className="text-2xl font-bold text-gray-900">{marketData.avgScore}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium mb-1">Active Signals</p>
                <p className="text-2xl font-bold text-gray-900">{signals.length}</p>
              </div>
            </div>

            {/* Top Movers + Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              {/* Top Movers — takes 3 cols */}
              <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center border-b border-gray-100">
                  <button
                    onClick={() => setMoversTab('rising')}
                    className={`flex-1 px-5 py-3.5 text-sm font-medium transition border-b-2 ${
                      moversTab === 'rising'
                        ? 'border-green-600 text-green-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-1.5">📈</span> Below Average
                    <span className="ml-2 text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                      {marketData.rising.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setMoversTab('falling')}
                    className={`flex-1 px-5 py-3.5 text-sm font-medium transition border-b-2 ${
                      moversTab === 'falling'
                        ? 'border-amber-600 text-amber-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-1.5">📉</span> Above Average
                    <span className="ml-2 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                      {marketData.falling.length}
                    </span>
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {(moversTab === 'rising' ? marketData.rising : marketData.falling).slice(0, 8).map((card, i) => (
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
                        <span className="text-sm font-medium text-gray-900">€{card.current_price.toFixed(2)}</span>
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
                  {(moversTab === 'rising' ? marketData.rising : marketData.falling).length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      No data available
                    </div>
                  )}
                </div>
              </div>

              {/* Price Chart — takes 2 cols */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Price Distribution</h3>
                <div style={{ height: '300px' }}>
                  <PriceChart deals={dealScores.slice(0, 20)} />
                </div>
              </div>
            </div>

            {/* Sets + Score Distribution Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Sets */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Sets by Volume</h3>
                <div className="space-y-3">
                  {marketData.topSets.map((set, i) => (
                    <div key={set.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-gray-400 w-5">{i + 1}</span>
                        <p className="text-sm text-gray-900 truncate">{set.name}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <span className="text-xs text-gray-500">{set.count} cards</span>
                        <span className="text-xs font-medium text-gray-700">Avg: {set.avgScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deal Quality Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Deal Quality</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Excellent (80+)', count: marketData.scoreDistribution.excellent, color: 'bg-green-500' },
                    { label: 'Good (65-79)', count: marketData.scoreDistribution.good, color: 'bg-blue-500' },
                    { label: 'Fair (50-64)', count: marketData.scoreDistribution.fair, color: 'bg-gray-400' },
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
                          style={{ width: `${Math.max(2, (item.count / marketData.totalProducts) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Range Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Price Range Distribution</h3>
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
                        : '0%'
                      }
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Signal Summary */}
            {signals.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Active Signals Summary</h3>
                  <a href="/signals" className="text-xs text-gray-500 hover:text-gray-700 font-medium">View all →</a>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-red-50">
                    <p className="text-2xl font-bold text-red-700">{marketData.signalBreakdown.high}</p>
                    <p className="text-xs font-medium text-red-600 mt-1">High Priority</p>
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
