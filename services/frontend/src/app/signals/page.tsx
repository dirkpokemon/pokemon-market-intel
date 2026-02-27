'use client';

import { useEffect, useState, useMemo } from 'react';
import { marketApi, Signal, DealScore } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';

interface PriceAlert {
  id: string;
  productName: string;
  targetPrice: number;
  direction: 'below' | 'above';
  createdAt: string;
  triggered: boolean;
}

export default function PriceAlertsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [deals, setDeals] = useState<DealScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'signals' | 'my-alerts'>('signals');
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom price alerts (persisted in localStorage)
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [newAlertSearch, setNewAlertSearch] = useState('');
  const [newAlertPrice, setNewAlertPrice] = useState('');
  const [newAlertDirection, setNewAlertDirection] = useState<'below' | 'above'>('below');

  useEffect(() => {
    // Load saved alerts
    const saved = localStorage.getItem('price_alerts');
    if (saved) setPriceAlerts(JSON.parse(saved));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sigResult, dealResult] = await Promise.allSettled([
        marketApi.getSignals({ limit: 200 }),
        marketApi.getDealScores({ limit: 100, min_score: 50 }),
      ]);
      if (sigResult.status === 'fulfilled') setSignals(sigResult.value);
      if (dealResult.status === 'fulfilled') setDeals(dealResult.value);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save alerts to localStorage
  const saveAlerts = (alerts: PriceAlert[]) => {
    setPriceAlerts(alerts);
    localStorage.setItem('price_alerts', JSON.stringify(alerts));
  };

  const createAlert = () => {
    if (!newAlertSearch.trim() || !newAlertPrice) return;
    const alert: PriceAlert = {
      id: Date.now().toString(),
      productName: newAlertSearch.trim(),
      targetPrice: parseFloat(newAlertPrice),
      direction: newAlertDirection,
      createdAt: new Date().toISOString(),
      triggered: false,
    };
    saveAlerts([alert, ...priceAlerts]);
    setNewAlertSearch('');
    setNewAlertPrice('');
    setShowCreateAlert(false);
  };

  const deleteAlert = (id: string) => {
    saveAlerts(priceAlerts.filter(a => a.id !== id));
  };

  // Check if any alerts are triggered by current prices
  const checkedAlerts = useMemo(() => {
    return priceAlerts.map(alert => {
      const matchingDeal = deals.find(d => 
        d.product_name.toLowerCase().includes(alert.productName.toLowerCase())
      );
      if (matchingDeal) {
        const isTriggered = alert.direction === 'below'
          ? matchingDeal.current_price <= alert.targetPrice
          : matchingDeal.current_price >= alert.targetPrice;
        return { ...alert, triggered: isTriggered, currentPrice: matchingDeal.current_price };
      }
      return { ...alert, currentPrice: undefined };
    });
  }, [priceAlerts, deals]);

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
    alertsActive: priceAlerts.length,
    alertsTriggered: checkedAlerts.filter(a => a.triggered).length,
  }), [signals, priceAlerts, checkedAlerts]);

  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'high': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
      case 'medium': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' };
      default: return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' };
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Price Alerts</h1>
            <p className="text-sm text-gray-500 mt-1">System signals & custom price alerts for your tracked cards</p>
          </div>
          <button
            onClick={() => setShowCreateAlert(!showCreateAlert)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Alert
          </button>
        </div>

        {/* Create Alert Panel */}
        {showCreateAlert && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Set a Price Alert</h3>
            <p className="text-xs text-gray-500 mb-4">Get notified when a card reaches your target price</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">Card name</label>
                <input
                  type="text"
                  value={newAlertSearch}
                  onChange={(e) => setNewAlertSearch(e.target.value)}
                  placeholder="e.g. Charizard ex"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Target price (€)</label>
                <input
                  type="number"
                  value={newAlertPrice}
                  onChange={(e) => setNewAlertPrice(e.target.value)}
                  placeholder="25.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Direction</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewAlertDirection('below')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition ${
                      newAlertDirection === 'below'
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    ↓ Below
                  </button>
                  <button
                    onClick={() => setNewAlertDirection('above')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition ${
                      newAlertDirection === 'above'
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    ↑ Above
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowCreateAlert(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={createAlert}
                disabled={!newAlertSearch.trim() || !newAlertPrice}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Set Alert
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading alerts...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Total Signals</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl border border-red-100 p-4">
                <p className="text-xs text-red-600 mb-1">High Priority</p>
                <p className="text-xl font-bold text-red-700">{stats.high}</p>
              </div>
              <div className="bg-white rounded-xl border border-amber-100 p-4">
                <p className="text-xs text-amber-600 mb-1">Medium</p>
                <p className="text-xl font-bold text-amber-700">{stats.medium}</p>
              </div>
              <div className="bg-white rounded-xl border border-blue-100 p-4">
                <p className="text-xs text-blue-600 mb-1">Low</p>
                <p className="text-xl font-bold text-blue-700">{stats.low}</p>
              </div>
              <div className="bg-white rounded-xl border border-green-100 p-4">
                <p className="text-xs text-green-600 mb-1">My Alerts</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-green-700">{stats.alertsActive}</p>
                  {stats.alertsTriggered > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                      {stats.alertsTriggered} triggered
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('signals')}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'signals'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                System Signals
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{signals.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('my-alerts')}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'my-alerts'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Price Alerts
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{priceAlerts.length}</span>
                {stats.alertsTriggered > 0 && (
                  <span className="ml-1 w-2 h-2 bg-green-500 rounded-full inline-block" />
                )}
              </button>
            </div>

            {/* === SYSTEM SIGNALS TAB === */}
            {activeTab === 'signals' && (
              <>
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
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    >
                      <option value="all">All Types</option>
                      {signalTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <button
                      onClick={loadData}
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Signals List */}
                <div className="space-y-3">
                  {filteredSignals.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-sm font-medium text-gray-900 mb-1">No signals found</p>
                      <p className="text-xs text-gray-500">
                        {filterLevel !== 'all' || filterType !== 'all' || searchQuery
                          ? 'Try adjusting your filters'
                          : 'Check back later for new market signals'}
                      </p>
                    </div>
                  ) : (
                    filteredSignals.slice(0, 50).map((signal) => {
                      const config = getLevelConfig(signal.signal_level);
                      return (
                        <div
                          key={signal.id}
                          className={`bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Priority dot */}
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${config.badge}`}>
                                  {signal.signal_level.toUpperCase()}
                                </span>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                  {signal.signal_type}
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
                                  <p className="text-sm font-bold text-gray-900">€{signal.current_price.toFixed(2)}</p>
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
                    })
                  )}
                </div>

                {filteredSignals.length > 50 && (
                  <p className="text-center text-xs text-gray-400 mt-4">
                    Showing 50 of {filteredSignals.length} signals
                  </p>
                )}
              </>
            )}

            {/* === MY PRICE ALERTS TAB === */}
            {activeTab === 'my-alerts' && (
              <>
                {checkedAlerts.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900 mb-1">No price alerts yet</p>
                    <p className="text-xs text-gray-500 mb-4">
                      Set target prices on cards you're watching to get notified when prices drop
                    </p>
                    <button
                      onClick={() => setShowCreateAlert(true)}
                      className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition"
                    >
                      Create your first alert
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {checkedAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`bg-white rounded-xl border p-5 transition ${
                          alert.triggered
                            ? 'border-green-200 bg-green-50/50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {alert.triggered ? (
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{alert.productName}</p>
                              <p className="text-xs text-gray-500">
                                Alert when price {alert.direction === 'below' ? 'drops below' : 'goes above'}{' '}
                                <span className="font-medium">€{alert.targetPrice.toFixed(2)}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {alert.currentPrice !== undefined && (
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Current</p>
                                <p className="text-sm font-bold text-gray-900">€{alert.currentPrice.toFixed(2)}</p>
                              </div>
                            )}
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              alert.triggered
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {alert.triggered ? 'TRIGGERED' : 'WATCHING'}
                            </span>
                            <button
                              onClick={() => deleteAlert(alert.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition rounded"
                              title="Delete alert"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
