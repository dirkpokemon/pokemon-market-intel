'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { marketApi, Signal } from '@/lib/api';
import MainNav from '@/components/MainNav';

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    loadSignals();
  }, [router]);

  const loadSignals = async () => {
    try {
      setLoading(true);
      const data = await marketApi.getSignals();
      setSignals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load signals');
    } finally {
      setLoading(false);
    }
  };

  const getSignalBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSignalIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return <span className="text-2xl">🔴</span>;
      case 'medium':
        return <span className="text-2xl">🟡</span>;
      case 'low':
        return <span className="text-2xl">🔵</span>;
      default:
        return <span className="text-2xl">⚪</span>;
    }
  };

  const filteredSignals = signals.filter(signal => {
    const levelMatch = filterLevel === 'all' || signal.signal_level === filterLevel;
    const typeMatch = filterType === 'all' || signal.signal_type === filterType;
    return levelMatch && typeMatch;
  });

  const signalTypes = Array.from(new Set(signals.map(s => s.signal_type)));

  const highSignals = filteredSignals.filter(s => s.signal_level === 'high').length;
  const mediumSignals = filteredSignals.filter(s => s.signal_level === 'medium').length;
  const lowSignals = filteredSignals.filter(s => s.signal_level === 'low').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <MainNav user={user} />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">🎯</div>
            <p className="text-gray-600">Loading signals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <MainNav user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Priority Signals</h1>
          <p className="text-gray-600">Real-time market alerts and trading opportunities</p>
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">High Priority</p>
                <p className="text-3xl font-bold text-red-600">{highSignals}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Medium Priority</p>
                <p className="text-3xl font-bold text-yellow-600">{mediumSignals}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Low Priority</p>
                <p className="text-3xl font-bold text-blue-600">{lowSignals}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">ℹ️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Priority Level:</label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Levels</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Signal Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {signalTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <button
              onClick={loadSignals}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Signals List */}
        {filteredSignals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg font-medium text-gray-900 mb-2">No signals found</p>
            <p className="text-sm text-gray-500">
              {filterLevel !== 'all' || filterType !== 'all' 
                ? 'Try adjusting your filters'
                : 'Check back later for new market opportunities'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSignals.map((signal) => (
              <div
                key={signal.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getSignalIcon(signal.signal_level)}
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getSignalBadgeColor(signal.signal_level)}`}>
                        {signal.signal_level.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {signal.signal_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(signal.detected_at).toLocaleDateString()} {new Date(signal.detected_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{signal.product_name}</h3>
                    
                    {signal.product_set && (
                      <p className="text-sm text-gray-500 mb-2">{signal.product_set}</p>
                    )}
                    
                    {signal.description && (
                      <p className="text-sm text-gray-700 mb-3">{signal.description}</p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm">
                      {signal.current_price && (
                        <div>
                          <span className="text-gray-500">Current Price: </span>
                          <span className="font-bold text-gray-900">€{signal.current_price.toFixed(2)}</span>
                        </div>
                      )}
                      {signal.deal_score && (
                        <div>
                          <span className="text-gray-500">Deal Score: </span>
                          <span className="font-bold text-blue-600">{signal.deal_score}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {signal.deal_score && (
                    <div className={`ml-6 w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      signal.deal_score >= 80 ? 'bg-green-100' :
                      signal.deal_score >= 70 ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <span className={`text-2xl font-bold ${
                        signal.deal_score >= 80 ? 'text-green-700' :
                        signal.deal_score >= 70 ? 'text-yellow-700' : 'text-blue-700'
                      }`}>
                        {signal.deal_score}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upgrade CTA for Free Users */}
        {user?.role === 'free' && (
          <div className="mt-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-2">🔔 Get Real-Time Alerts</h3>
            <p className="mb-4 text-purple-100">
              Upgrade to Premium to receive instant notifications for high-priority signals via Email and Telegram
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Upgrade to Premium
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
