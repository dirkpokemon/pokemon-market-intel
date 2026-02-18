'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { marketApi, DealScore } from '@/lib/api';
import MainNav from '@/components/MainNav';
import DealModal from '@/components/DealModal';

export default function WatchlistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<DealScore | null>(null);

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

    // Load watchlist from localStorage
    const savedWatchlist = localStorage.getItem('watchlist');
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist));
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const scores = await marketApi.getDealScores({ limit: 100, min_score: 50 });
      setDealScores(scores);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
    }
  };

  const toggleWatchlist = (dealId: number) => {
    const newWatchlist = watchlist.filter(id => id !== dealId);
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  const watchlistDeals = dealScores.filter(deal => watchlist.includes(deal.id));

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 70) return 'bg-yellow-50';
    return 'bg-blue-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <MainNav user={user} />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⭐</div>
            <p className="text-gray-600">Loading your watchlist...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⭐ My Watchlist</h1>
          <p className="text-gray-600">
            {watchlistDeals.length > 0 
              ? `You have ${watchlistDeals.length} saved deal${watchlistDeals.length !== 1 ? 's' : ''}`
              : 'Save deals you want to track'
            }
          </p>
        </div>

        {/* Empty State */}
        {watchlistDeals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Your watchlist is empty</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start building your watchlist by clicking the star icon on any deal you want to track.
              We&apos;ll save them here for quick access!
            </p>
            <Link
              href="/deals"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              <span>Browse Top Deals</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Watched Deals</span>
                  <span className="text-2xl">⭐</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{watchlistDeals.length}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Avg Deal Score</span>
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {watchlistDeals.length > 0 
                    ? Math.round(watchlistDeals.reduce((sum, d) => sum + d.deal_score, 0) / watchlistDeals.length)
                    : 0
                  }
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Total Value</span>
                  <span className="text-2xl">💰</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  €{watchlistDeals.reduce((sum, d) => sum + d.current_price, 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Watchlist Grid */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Saved Deals</h2>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear your entire watchlist?')) {
                      setWatchlist([]);
                      localStorage.setItem('watchlist', JSON.stringify([]));
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {watchlistDeals.map((deal) => (
                  <div 
                    key={deal.id} 
                    onClick={() => setSelectedDeal(deal)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition cursor-pointer group relative"
                  >
                    {/* Remove Star */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(deal.id);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-yellow-100 hover:bg-red-100 transition group/btn"
                      title="Remove from watchlist"
                    >
                      <span className="text-xl group-hover/btn:hidden">⭐</span>
                      <span className="text-xl hidden group-hover/btn:inline">🗑️</span>
                    </button>

                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-900 flex-1 leading-tight group-hover:text-blue-600 transition line-clamp-2 pr-10">
                        {deal.product_name}
                      </h3>
                      <div className={`ml-3 w-12 h-12 rounded-lg ${getScoreBgColor(deal.deal_score)} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-lg font-bold ${getScoreColor(deal.deal_score)}`}>
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

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-3">Looking for more deals?</h3>
              <p className="mb-6 text-blue-100">
                Browse our full collection of {dealScores.length}+ verified deals
              </p>
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
              >
                <span>Browse All Deals</span>
                <span>→</span>
              </Link>
            </div>
          </>
        )}
      </main>

      {/* Deal Details Modal */}
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </div>
  );
}
