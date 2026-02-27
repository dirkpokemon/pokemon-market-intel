'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { marketApi, Signal, DealScore } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/StatCard';
import DealModal from '@/components/DealModal';
import OnboardingTour from '@/components/OnboardingTour';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<DealScore | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

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

    // Show onboarding for first-time users
    const hasSeenTour = localStorage.getItem('onboarding_completed');
    if (!hasSeenTour) {
      setShowOnboarding(true);
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const scores = await marketApi.getDealScores({ limit: 100, min_score: 60 });
      setDealScores(scores);
      
      try {
        const sigs = await marketApi.getSignals({ limit: 50 });
        setSignals(sigs);
      } catch (err) {
        console.log('Signals require premium');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
    }
  };

  const topDeals = dealScores.slice(0, 5);
  const recentSignals = signals.slice(0, 3);
  const excellentDeals = dealScores.filter(d => d.deal_score >= 80).length;
  const avgDealScore = dealScores.length > 0 
    ? Math.round(dealScores.reduce((sum, d) => sum + d.deal_score, 0) / dealScores.length)
    : 0;

  // Search results — filters deal scores by name or set
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return dealScores
      .filter(d =>
        d.product_name.toLowerCase().includes(q) ||
        (d.product_set?.toLowerCase().includes(q) ?? false)
      )
      .sort((a, b) => b.deal_score - a.deal_score)
      .slice(0, 8);
  }, [searchQuery, dealScores]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchActive(true);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') {
      setSearchQuery('');
      setSearchActive(false);
    }
  };

  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : user?.email?.split('@')[0] || 'Trainer';

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading your dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Welcome Banner */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {displayName}! 👋
              </h1>
              <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening in the EU Pokémon market today.</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Deals" value={dealScores.length} subtitle="Active opportunities" icon="🎴" color="blue" />
              <StatCard title="Avg Deal Score" value={avgDealScore} subtitle="Market average" icon="📊" color="purple" trend={{ value: 12, label: 'vs last week', isPositive: true }} />
              <StatCard title="Excellent Deals" value={excellentDeals} subtitle="Score 80+" icon="⭐" color="green" />
              <StatCard title="Active Signals" value={signals.length} subtitle="Real-time alerts" icon="🎯" color="blue" />
            </div>

            {/* ═══ Market Search ═══ */}
            <div className="bg-gray-900 rounded-2xl p-6 mb-8 relative overflow-hidden">
              {/* Subtle grid pattern overlay */}
              <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }} />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-lg font-bold text-white">Market Search</h2>
                  <span className="px-2.5 py-0.5 bg-green-500/20 text-green-400 text-[11px] font-bold rounded-full tracking-wider uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Live
                  </span>
                </div>

                {/* Search bar */}
                <div className="flex gap-3 mb-1">
                  <div className="flex-1 relative">
                    <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value.trim()) setSearchActive(true);
                        else setSearchActive(false);
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search any Pokémon card, set, or product..."
                      className="w-full pl-12 pr-10 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => { setSearchQuery(''); setSearchActive(false); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition flex items-center gap-2 flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="hidden sm:inline">Search</span>
                  </button>
                </div>

                {/* Search Results */}
                {searchActive && searchQuery.trim() && (
                  <div className="mt-4">
                    {searchResults.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No results found for &quot;{searchQuery}&quot;</p>
                        <p className="text-gray-600 text-xs mt-1">Try a different card name or set</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-gray-500">
                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                          </p>
                          <Link href="/deals" className="text-xs text-green-400 hover:text-green-300 font-medium transition">
                            Browse all deals →
                          </Link>
                        </div>
                        <div className="space-y-2">
                          {searchResults.map((deal) => (
                            <div
                              key={deal.id}
                              onClick={() => setSelectedDeal(deal)}
                              className="flex items-center gap-4 p-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl cursor-pointer transition group"
                            >
                              {/* Card icon placeholder */}
                              <div className="w-12 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-600">
                                <span className="text-xl">🃏</span>
                              </div>

                              {/* Card info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-white truncate group-hover:text-green-300 transition">
                                  {deal.product_name}
                                </h3>
                                {deal.product_set && (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">{deal.product_set}</p>
                                )}
                              </div>

                              {/* Price + Score */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <p className="text-base font-bold text-white">€{deal.current_price.toFixed(2)}</p>
                                  {deal.market_avg_price && deal.market_avg_price > deal.current_price && (
                                    <p className="text-[11px] text-green-400 font-medium">
                                      {Math.round((1 - deal.current_price / deal.market_avg_price) * 100)}% below avg
                                    </p>
                                  )}
                                </div>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  deal.deal_score >= 80 ? 'bg-green-500/20' : deal.deal_score >= 70 ? 'bg-amber-500/20' : 'bg-gray-700'
                                }`}>
                                  <span className={`text-sm font-bold ${
                                    deal.deal_score >= 80 ? 'text-green-400' : deal.deal_score >= 70 ? 'text-amber-400' : 'text-gray-400'
                                  }`}>
                                    {deal.deal_score}
                                  </span>
                                </div>
                                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* What you get — shown when no search is active */}
                {!searchActive && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { icon: '📊', label: 'Real-time price tracking' },
                      { icon: '💰', label: 'Deal score analysis' },
                      { icon: '🔔', label: 'Price alert notifications' },
                      { icon: '📈', label: 'Market trend insights' },
                      { icon: '🌍', label: 'EU market coverage' },
                      { icon: '⚡', label: 'Updated every hour' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-800/40 rounded-lg">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <Link href="/insights" className="block group">
                <div className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition h-full">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-xl">📈</div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Market Pulse</h2>
                      <p className="text-xs text-gray-400">Daily market overview & top movers</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm font-medium group-hover:text-white group-hover:gap-3 transition-all gap-2">
                    <span>Explore</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>

              <Link href="/deals" className="block group">
                <div className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition h-full">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-xl">💎</div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Top Deals</h2>
                      <p className="text-xs text-gray-400">Browse {dealScores.length} verified deals</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm font-medium group-hover:text-white group-hover:gap-3 transition-all gap-2">
                    <span>View All</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Recent Signals */}
            {signals.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Priority Signals</h2>
                  <Link href="/signals" className="text-xs text-gray-500 hover:text-gray-700 font-medium">View all →</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recentSignals.map((signal) => (
                    <div key={signal.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          signal.signal_level === 'high' ? 'bg-red-100 text-red-800' :
                          signal.signal_level === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {signal.signal_level.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(signal.detected_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{signal.product_name}</h3>
                      <p className="text-xs text-gray-500 mb-2">{signal.signal_type}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">€{signal.current_price?.toFixed(2) || 'N/A'}</span>
                        {signal.deal_score && (
                          <span className="font-bold text-green-700">Score: {signal.deal_score}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top 5 Deals Preview */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Today&apos;s Top Deals</h2>
                <Link href="/deals" className="text-xs text-gray-500 hover:text-gray-700 font-medium">View all →</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topDeals.map((deal) => (
                  <div 
                    key={deal.id} 
                    onClick={() => setSelectedDeal(deal)}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 flex-1 line-clamp-2 pr-2">{deal.product_name}</h3>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        deal.deal_score >= 80 ? 'bg-green-50' : deal.deal_score >= 70 ? 'bg-amber-50' : 'bg-gray-50'
                      }`}>
                        <span className={`text-sm font-bold ${
                          deal.deal_score >= 80 ? 'text-green-700' : deal.deal_score >= 70 ? 'text-amber-700' : 'text-gray-600'
                        }`}>
                          {deal.deal_score}
                        </span>
                      </div>
                    </div>
                    {deal.product_set && (
                      <p className="text-xs text-gray-500 mb-2 truncate">{deal.product_set}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-lg font-bold text-gray-900">€{deal.current_price.toFixed(2)}</p>
                      </div>
                      {deal.market_avg_price && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Avg €{deal.market_avg_price.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/watchlist" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">⭐</div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition">My Watchlist</h3>
                    <p className="text-xs text-gray-500">Manage saved deals</p>
                  </div>
                </div>
              </Link>
              <Link href="/signals" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">🔔</div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition">Price Alerts</h3>
                    <p className="text-xs text-gray-500">Set target prices</p>
                  </div>
                </div>
              </Link>
              <Link href="/settings" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">⚙️</div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition">Settings</h3>
                    <p className="text-xs text-gray-500">Preferences & account</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Upgrade CTA for Free Users */}
            {user?.role === 'free' && (
              <div className="mt-8 bg-gray-900 rounded-xl p-8 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Unlock Premium Features</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Get real-time signals, advanced analytics, email & Telegram alerts, and more!
                </p>
                <Link
                  href="/pricing"
                  className="inline-block bg-white text-gray-900 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
                >
                  Upgrade to Premium
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Deal Details Modal */}
      {selectedDeal && (
        <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}

      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour onComplete={() => {
          setShowOnboarding(false);
          localStorage.setItem('onboarding_completed', 'true');
        }} />
      )}
    </DashboardLayout>
  );
}
