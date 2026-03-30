'use client';

import { useEffect, useState, useMemo } from 'react';
import { marketApi, Signal, DealScore } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import CardImage from '@/components/CardImage';
import Link from 'next/link';

export default function PriceSignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
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
      const result = await marketApi.getSignals({ limit: 100 });
      console.log(`[Signals] Loaded ${result.length} signals`);
      setSignals(result);
    } catch (err: any) {
      console.error('[Signals] Failed to load:', err?.message, 'status:', err?.status);
      // 401 = not authenticated (expired token)
      if (err?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      // 403 = premium required
      if (err?.status === 403 || err?.message?.includes('premium') || err?.message?.includes('subscription') || err?.message?.includes('Premium')) {
        setAccessDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtered signals
  const filteredSignals = useMemo(() => {
    return signals.filter(signal => {
      const levelMatch = filterLevel === 'all' || signal.signal_level === filterLevel;
      const typeMatch = filterType === 'all' || signal.signal_type === filterType;
      const searchMatch = !searchQuery || 
        signal.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.signal_type.toLowerCase().includes(searchQuery.toLowerCase());
      return levelMatch && typeMatch && searchMatch;
    });
  }, [signals, filterLevel, filterType, searchQuery]);

  const signalTypes = Array.from(new Set(signals.map(s => s.signal_type)));

  const stats = useMemo(() => ({
    total: signals.length,
    high: signals.filter(s => s.signal_level === 'high').length,
    medium: signals.filter(s => s.signal_level === 'medium').length,
    low: signals.filter(s => s.signal_level === 'low').length,
  }), [signals]);

  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'high': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
      case 'medium': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' };
      default: return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' };
    }
  };

  const isPaid = user?.role === 'paid' || user?.role === 'pro' || user?.role === 'admin';

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Price Signals</h1>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-md uppercase tracking-wide">PRO</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              AI-powered market signals — spot undervalued cards, momentum shifts, and arbitrage opportunities before anyone else.
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

        {/* PRO gate for free users or when access is denied */}
        {(!isPaid || accessDenied) && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Unlock Price Signals</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Price Signals uses machine learning to detect market anomalies — undervalued cards, price momentum, 
                  cross-country arbitrage, and risk patterns — updated every hour.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Undervalued alerts', icon: '💎' },
                    { label: 'Momentum tracking', icon: '📈' },
                    { label: 'Arbitrage finder', icon: '🌍' },
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
                  Upgrade to PRO
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
              <p className="text-sm text-gray-500">Loading signals...</p>
            </div>
          </div>
        ) : accessDenied && signals.length === 0 ? (
          /* Only show the PRO gate (already rendered above) — no empty stats */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-indigo-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Price Signals are a PRO feature</h3>
            <p className="text-sm text-gray-500 mb-1">Upgrade your account to access AI-powered market signals.</p>
            <p className="text-xs text-gray-400 mb-5">Undervalued cards, momentum shifts, arbitrage — updated every hour.</p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              Upgrade to PRO
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Total Signals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl border border-red-100 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <p className="text-xs text-red-600">High Priority</p>
                </div>
                <p className="text-2xl font-bold text-red-700">{stats.high}</p>
              </div>
              <div className="bg-white rounded-xl border border-amber-100 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-xs text-amber-600">Medium</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">{stats.medium}</p>
              </div>
              <div className="bg-white rounded-xl border border-blue-100 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <p className="text-xs text-blue-600">Low</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.low}</p>
              </div>
            </div>

            {/* Filters */}
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
                    placeholder="Search signals..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value as any)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🔵 Low</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  {signalTypes.map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                {/* View toggle */}
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'compact' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    Compact
                  </button>
                </div>
              </div>
            </div>

            {/* Signals List */}
            {filteredSignals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm font-medium text-gray-900 mb-1">No signals found</p>
                <p className="text-xs text-gray-500">
                  {filterLevel !== 'all' || filterType !== 'all' || searchQuery
                    ? 'Try adjusting your filters'
                    : 'Check back later for new market signals'}
                </p>
              </div>
            ) : viewMode === 'compact' ? (
              /* Compact view — more data at a glance */
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Signal</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Card</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Type</th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Price</th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Score</th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSignals.slice(0, 100).map((signal) => {
                        const config = getLevelConfig(signal.signal_level);
                        return (
                          <tr key={signal.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                            <td className="px-5 py-3">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${config.badge}`}>
                                {signal.signal_level.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{signal.product_name}</p>
                              {signal.product_set && <p className="text-[11px] text-gray-400 truncate">{signal.product_set}</p>}
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs text-gray-600">{signal.signal_type.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              {signal.current_price ? (
                                <span className="text-sm font-semibold text-gray-900">&euro;{signal.current_price.toFixed(2)}</span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {signal.deal_score ? (
                                <span className={`text-sm font-bold ${
                                  signal.deal_score >= 80 ? 'text-green-700' : signal.deal_score >= 65 ? 'text-amber-700' : 'text-gray-600'
                                }`}>{signal.deal_score}</span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-xs text-gray-400">
                                {new Date(signal.detected_at).toLocaleDateString()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* List view — detailed cards */
              <div className="space-y-3">
                {filteredSignals.slice(0, 50).map((signal) => {
                  const config = getLevelConfig(signal.signal_level);
                  return (
                    <div
                      key={signal.id}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition"
                    >
                      <div className="flex items-start gap-4">
                        {/* Priority dot */}
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
                        
                        {/* Card image */}
                        <CardImage cardName={signal.product_name} size="sm" />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${config.badge}`}>
                              {signal.signal_level.toUpperCase()}
                            </span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {signal.signal_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11px] text-gray-400 ml-auto">
                              {new Date(signal.detected_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-0.5 truncate">
                            {signal.product_name}
                          </h4>
                          {signal.product_set && (
                            <p className="text-xs text-gray-400 mb-1">{signal.product_set}</p>
                          )}
                          {signal.description && (
                            <p className="text-xs text-gray-600">{signal.description}</p>
                          )}
                        </div>

                        {/* Price & Score */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {signal.current_price && (
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Price</p>
                              <p className="text-sm font-bold text-gray-900">&euro;{signal.current_price.toFixed(2)}</p>
                            </div>
                          )}
                          {signal.deal_score && (
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              signal.deal_score >= 80 ? 'bg-green-50' :
                              signal.deal_score >= 65 ? 'bg-amber-50' : 'bg-gray-50'
                            }`}>
                              <span className={`text-sm font-bold ${
                                signal.deal_score >= 80 ? 'text-green-700' :
                                signal.deal_score >= 65 ? 'text-amber-700' : 'text-gray-600'
                              }`}>
                                {signal.deal_score}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredSignals.length > (viewMode === 'compact' ? 100 : 50) && (
              <p className="text-center text-xs text-gray-400 mt-4">
                Showing {viewMode === 'compact' ? 100 : 50} of {filteredSignals.length} signals
              </p>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
