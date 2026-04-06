'use client';

import { useEffect, useState, useMemo } from 'react';
import { marketApi, Signal, MarketDigest, SetTrend } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import CardImage from '@/components/CardImage';
import Link from 'next/link';
import { SUBSCRIBER_BADGE, UPSELL_SUBSCRIBE } from '@/lib/plans';

const SIGNAL_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  momentum:       { label: 'Momentum',       icon: '🚀', color: 'text-green-700 bg-green-50 border-green-200' },
  risk:           { label: 'Risk',           icon: '⚠️',  color: 'text-red-700 bg-red-50 border-red-200' },
  price_drop:     { label: 'Price Drop',     icon: '📉', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  supply_surge:   { label: 'Supply Surge',   icon: '📦', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  supply_drop:    { label: 'Supply Drop',    icon: '🔒', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  volatility:     { label: 'Volatile',       icon: '🎢', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  set_rising:     { label: 'Set Rising',     icon: '📈', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  set_declining:  { label: 'Set Declining',  icon: '📉', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

function getTypeMeta(type: string) {
  return SIGNAL_TYPE_META[type] || { label: type.replace(/_/g, ' '), icon: '📊', color: 'text-gray-700 bg-gray-50 border-gray-200' };
}

function getLevelConfig(level: string) {
  switch (level) {
    case 'high': return { badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
    case 'medium': return { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' };
    default: return { badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' };
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Set Trend Row ──────────────────────────────────────────

function SetTrendRow({ trend, direction }: { trend: SetTrend; direction: 'up' | 'down' }) {
  const isUp = direction === 'up';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{trend.product_set}</p>
        <p className="text-[11px] text-gray-400">{trend.card_count} cards &middot; avg &euro;{trend.avg_price.toFixed(2)}</p>
      </div>
      <div className={`text-right flex-shrink-0 ml-4 ${isUp ? 'text-green-600' : 'text-red-600'}`}>
        <p className="text-sm font-bold">{isUp ? '+' : ''}{trend.avg_trend.toFixed(1)}%</p>
        <p className="text-[11px] opacity-70">vol {trend.avg_volume_trend >= 0 ? '+' : ''}{trend.avg_volume_trend.toFixed(0)}%</p>
      </div>
    </div>
  );
}

// ─── Signal Card ────────────────────────────────────────────

function SignalCard({ signal }: { signal: Signal }) {
  const meta = getTypeMeta(signal.signal_type);
  const level = getLevelConfig(signal.signal_level);
  const isSetSignal = signal.category === 'set_trend';

  let parsedMeta: Record<string, any> = {};
  try { if (signal.signal_metadata) parsedMeta = JSON.parse(signal.signal_metadata); } catch {}

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition">
      <div className="flex items-start gap-4">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${level.dot}`} />

        {!isSetSignal && <CardImage cardName={signal.product_name} size="sm" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${level.badge}`}>
              {signal.signal_level.toUpperCase()}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
            <span className="text-[11px] text-gray-400 ml-auto">{timeAgo(signal.detected_at)}</span>
          </div>

          <h4 className="text-sm font-semibold text-gray-900 mb-0.5 truncate">{signal.product_name}</h4>
          {signal.product_set && !isSetSignal && (
            <p className="text-xs text-gray-400 mb-1">{signal.product_set}</p>
          )}
          {signal.description && <p className="text-xs text-gray-600 leading-relaxed">{signal.description}</p>}

          {/* Metadata pills */}
          {Object.keys(parsedMeta).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {parsedMeta.price_trend !== undefined && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${parsedMeta.price_trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  price {parsedMeta.price_trend >= 0 ? '+' : ''}{parsedMeta.price_trend}%
                </span>
              )}
              {parsedMeta.volume_trend !== undefined && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${parsedMeta.volume_trend >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                  vol {parsedMeta.volume_trend >= 0 ? '+' : ''}{parsedMeta.volume_trend}%
                </span>
              )}
              {parsedMeta.volatility !== undefined && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                  volatility {parsedMeta.volatility}%
                </span>
              )}
            </div>
          )}
        </div>

        {signal.current_price && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">Price</p>
            <p className="text-sm font-bold text-gray-900">&euro;{signal.current_price.toFixed(2)}</p>
            {signal.market_avg_price && signal.market_avg_price !== signal.current_price && (
              <p className="text-[11px] text-gray-400">avg &euro;{signal.market_avg_price.toFixed(2)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function PriceSignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [digest, setDigest] = useState<MarketDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setAccessDenied(false);
      const [signalsResult, digestResult] = await Promise.allSettled([
        marketApi.getSignals({ limit: 100 }),
        marketApi.getMarketDigest(),
      ]);
      if (signalsResult.status === 'fulfilled') setSignals(signalsResult.value);
      else {
        const err = signalsResult.reason;
        if (err?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        if (err?.status === 403) setAccessDenied(true);
      }
      if (digestResult.status === 'fulfilled') setDigest(digestResult.value);
    } finally {
      setLoading(false);
    }
  };

  const filteredSignals = useMemo(() => {
    return signals.filter(signal => {
      const typeMatch = filterType === 'all' || signal.signal_type === filterType;
      const searchMatch = !searchQuery ||
        signal.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.signal_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (signal.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && searchMatch;
    });
  }, [signals, filterType, searchQuery]);

  const signalTypes = useMemo(() => Array.from(new Set(signals.map(s => s.signal_type))), [signals]);
  const isPaid = user?.role === 'paid' || user?.role === 'pro' || user?.role === 'admin';

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Signals</h1>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-md uppercase tracking-wide">{SUBSCRIBER_BADGE}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Real-time market signals — momentum shifts, supply changes, set trends, and risk patterns.
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Subscriber gate */}
        {(!isPaid || accessDenied) && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Unlock Signals</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Track momentum shifts, supply changes, volatility spikes, and set-level trends — updated every hour.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Momentum tracking', icon: '🚀' },
                    { label: 'Supply monitoring', icon: '📦' },
                    { label: 'Set trends', icon: '📈' },
                    { label: 'Risk warnings', icon: '⚠️' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-2 text-sm text-gray-700">
                      <span>{f.icon}</span>
                      <span className="text-xs font-medium">{f.label}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                  {UPSELL_SUBSCRIBE}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading market data...</p>
            </div>
          </div>
        ) : accessDenied && signals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-indigo-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Signals need Plus or Business</h3>
            <p className="text-sm text-gray-500 mb-5">Upgrade your account to access real-time market signals.</p>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">
              {UPSELL_SUBSCRIBE}
            </Link>
          </div>
        ) : (
          <>
            {/* ─── Market Digest Row ─────────────────────── */}
            {digest && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Cards Tracked</p>
                  <p className="text-2xl font-bold text-gray-900">{digest.total_cards_tracked.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-400">{digest.total_sets} sets</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{digest.total_listings.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-400">across all sources</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Active Signals</p>
                  <p className="text-2xl font-bold text-gray-900">{signals.length}</p>
                  <p className="text-[11px] text-gray-400">{Object.keys(digest.signal_counts).length} categories</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Last Analysis</p>
                  <p className="text-lg font-bold text-gray-900">
                    {digest.last_analysis_at ? timeAgo(digest.last_analysis_at) : 'Pending'}
                  </p>
                  <p className="text-[11px] text-gray-400">updates every hour</p>
                </div>
              </div>
            )}

            {/* ─── Signal Type Overview ──────────────────── */}
            {digest && Object.keys(digest.signal_counts).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Signal Breakdown</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(digest.signal_counts).map(([type, count]) => {
                    const meta = getTypeMeta(type);
                    return (
                      <button
                        key={type}
                        onClick={() => setFilterType(filterType === type ? 'all' : type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                          filterType === type ? 'ring-2 ring-gray-400 ' + meta.color : meta.color + ' opacity-80 hover:opacity-100'
                        }`}
                      >
                        <span>{meta.icon}</span>
                        <span className="capitalize">{meta.label}</span>
                        <span className="ml-1 text-[11px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Set Trends ────────────────────────────── */}
            {digest && (digest.top_rising_sets.length > 0 || digest.top_declining_sets.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {digest.top_rising_sets.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-green-600">📈</span>
                      <h3 className="text-sm font-semibold text-gray-900">Rising Sets</h3>
                    </div>
                    {digest.top_rising_sets.map(t => (
                      <SetTrendRow key={t.product_set} trend={t} direction="up" />
                    ))}
                  </div>
                )}
                {digest.top_declining_sets.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-red-600">📉</span>
                      <h3 className="text-sm font-semibold text-gray-900">Declining Sets</h3>
                    </div>
                    {digest.top_declining_sets.map(t => (
                      <SetTrendRow key={t.product_set} trend={t} direction="down" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Filters ──────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px] relative">
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search signals by card, set, or description..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  {signalTypes.map(type => {
                    const meta = getTypeMeta(type);
                    return <option key={type} value={type}>{meta.icon} {meta.label}</option>;
                  })}
                </select>
                {filterType !== 'all' && (
                  <button
                    onClick={() => setFilterType('all')}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>

            {/* ─── Signal Feed ───────────────────────────── */}
            {filteredSignals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm font-medium text-gray-900 mb-1">No signals found</p>
                <p className="text-xs text-gray-500">
                  {filterType !== 'all' || searchQuery
                    ? 'Try adjusting your filters'
                    : 'Signals will appear after the next analysis cycle (runs every hour)'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSignals.slice(0, 60).map(signal => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}

            {filteredSignals.length > 60 && (
              <p className="text-center text-xs text-gray-400 mt-4">
                Showing 60 of {filteredSignals.length} signals
              </p>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
