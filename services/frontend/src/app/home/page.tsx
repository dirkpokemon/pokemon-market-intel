'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { marketApi, Signal, DealScore } from '@/lib/api';
import MainNav from '@/components/MainNav';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <MainNav user={user} />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⚡</div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const topDeals = dealScores.slice(0, 5);
  const recentSignals = signals.slice(0, 3);
  const excellentDeals = dealScores.filter(d => d.deal_score >= 80).length;
  const avgDealScore = dealScores.length > 0 
    ? Math.round(dealScores.reduce((sum, d) => sum + d.deal_score, 0) / dealScores.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <MainNav user={user} />
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name ? user.full_name.split(' ')[0] : user?.email?.split('@')[0] || 'Trainer'}! 👋
          </h1>
          <p className="text-gray-600">Here&apos;s what&apos;s happening in the EU Pokémon market today.</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Deals"
            value={dealScores.length}
            subtitle="Active opportunities"
            icon="🎴"
            color="blue"
          />
          <StatCard
            title="Avg Deal Score"
            value={avgDealScore}
            subtitle="Market average"
            icon="📊"
            color="purple"
            trend={{
              value: 12,
              label: 'vs last week',
              isPositive: true
            }}
          />
          <StatCard
            title="Excellent Deals"
            value={excellentDeals}
            subtitle="Score 80+"
            icon="⭐"
            color="green"
          />
          <StatCard
            title="Active Signals"
            value={signals.length}
            subtitle="Real-time alerts"
            icon="🎯"
            color="blue"
          />
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Market Insights Card */}
          <Link href="/insights" className="block group">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-8 hover:shadow-xl transition h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center text-3xl">
                  📊
                </div>
                <span className="text-blue-100 text-sm font-medium">Analytics</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Market Insights</h2>
              <p className="text-blue-100 mb-4">
                Deep dive into market trends, price analysis, and trading volumes
              </p>
              <div className="flex items-center text-white font-semibold group-hover:gap-3 transition-all gap-2">
                <span>Explore Insights</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

          {/* Top Deals Card */}
          <Link href="/deals" className="block group">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-8 hover:shadow-xl transition h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center text-3xl">
                  💎
                </div>
                <span className="text-green-100 text-sm font-medium">Best Value</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Top Deals</h2>
              <p className="text-green-100 mb-4">
                Browse {dealScores.length} verified deals with AI-powered scoring
              </p>
              <div className="flex items-center text-white font-semibold group-hover:gap-3 transition-all gap-2">
                <span>View All Deals</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Signals Section */}
        {signals.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🎯 Priority Signals</h2>
              <Link href="/signals" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentSignals.map((signal) => (
                <div key={signal.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      signal.signal_level === 'high' ? 'bg-red-100 text-red-800' :
                      signal.signal_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {signal.signal_level.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(signal.detected_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                    {signal.product_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{signal.signal_type}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">€{signal.current_price?.toFixed(2) || 'N/A'}</span>
                    {signal.deal_score && (
                      <span className="font-bold text-green-600">Score: {signal.deal_score}</span>
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
            <h2 className="text-xl font-bold text-gray-900">💎 Today&apos;s Top Deals</h2>
            <Link href="/deals" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topDeals.map((deal) => (
              <div 
                key={deal.id} 
                onClick={() => setSelectedDeal(deal)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 flex-1 line-clamp-2 pr-2">
                    {deal.product_name}
                  </h3>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    deal.deal_score >= 80 ? 'bg-green-50' :
                    deal.deal_score >= 70 ? 'bg-yellow-50' :
                    'bg-blue-50'
                  }`}>
                    <span className={`text-lg font-bold ${
                      deal.deal_score >= 80 ? 'text-green-600' :
                      deal.deal_score >= 70 ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {deal.deal_score}
                    </span>
                  </div>
                </div>
                
                {deal.product_set && (
                  <p className="text-sm text-gray-600 mb-3 truncate">{deal.product_set}</p>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Current Price</p>
                    <p className="text-xl font-bold text-gray-900">€{deal.current_price.toFixed(2)}</p>
                  </div>
                  {deal.market_avg_price && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-0.5">Market Avg</p>
                      <p className="text-sm font-semibold text-gray-700">€{deal.market_avg_price.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/watchlist" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center text-2xl">
                ⭐
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">My Watchlist</h3>
                <p className="text-sm text-gray-600">Manage saved deals</p>
              </div>
            </div>
          </Link>

          <Link href="/signals" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl">
                🎯
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">Priority Signals</h3>
                <p className="text-sm text-gray-600">Real-time alerts</p>
              </div>
            </div>
          </Link>

          <Link href="/settings" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-2xl">
                ⚙️
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">Settings</h3>
                <p className="text-sm text-gray-600">Preferences & account</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Upgrade CTA for Free Users */}
        {user?.role === 'free' && (
          <div className="mt-8 bg-gray-900 rounded-xl shadow-lg p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-3">🚀 Unlock Premium Features</h3>
            <p className="mb-6 text-gray-300">
              Get real-time signals, advanced analytics, email & Telegram alerts, and more!
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}
      </main>

      {/* Deal Details Modal */}
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}

      {/* Onboarding Tour - shows on first visit */}
      {showOnboarding && (
        <OnboardingTour onComplete={() => {
          setShowOnboarding(false);
          localStorage.setItem('onboarding_completed', 'true');
        }} />
      )}
    </div>
  );
}
