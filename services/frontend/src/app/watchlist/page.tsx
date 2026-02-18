'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { marketApi, DealScore } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import DealModal from '@/components/DealModal';

export default function WatchlistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<DealScore | null>(null);

  useEffect(() => {
    const savedWatchlist = localStorage.getItem('watchlist');
    if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const scores = await marketApi.getDealScores({ limit: 100, min_score: 50 });
      setDealScores(scores);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = (dealId: number) => {
    const newWatchlist = watchlist.filter(id => id !== dealId);
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  const watchlistDeals = dealScores.filter(deal => watchlist.includes(deal.id));

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-700';
    if (score >= 70) return 'text-amber-700';
    return 'text-gray-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 70) return 'bg-amber-50';
    return 'bg-gray-50';
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Watchlist</h1>
          <p className="text-sm text-gray-500 mt-1">
            {watchlistDeals.length > 0
              ? `You have ${watchlistDeals.length} saved deal${watchlistDeals.length !== 1 ? 's' : ''}`
              : 'Save deals you want to track'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading watchlist...</p>
            </div>
          </div>
        ) : watchlistDeals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p className="text-sm font-medium text-gray-900 mb-1">Your watchlist is empty</p>
            <p className="text-xs text-gray-500 mb-4">Click the star icon on any deal to save it here for quick access</p>
            <Link href="/deals" className="inline-block px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition">
              Browse Top Deals
            </Link>
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 mb-1">Watched Deals</p>
                <p className="text-2xl font-bold text-gray-900">{watchlistDeals.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 mb-1">Avg Deal Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {watchlistDeals.length > 0
                    ? Math.round(watchlistDeals.reduce((sum, d) => sum + d.deal_score, 0) / watchlistDeals.length)
                    : 0}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 mb-1">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  €{watchlistDeals.reduce((sum, d) => sum + d.current_price, 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Clear All */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Saved Deals</h2>
              <button
                onClick={() => {
                  if (confirm('Clear your entire watchlist?')) {
                    setWatchlist([]);
                    localStorage.setItem('watchlist', JSON.stringify([]));
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
              {watchlistDeals.map((deal) => (
                <div 
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition cursor-pointer group relative"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromWatchlist(deal.id); }}
                    className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-amber-50 hover:bg-red-50 transition text-sm"
                    title="Remove"
                  >
                    ⭐
                  </button>

                  <div className="flex justify-between items-start mb-2 pr-8">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{deal.product_name}</h3>
                    <div className={`ml-2 w-10 h-10 rounded-lg ${getScoreBg(deal.deal_score)} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-sm font-bold ${getScoreColor(deal.deal_score)}`}>{deal.deal_score}</span>
                    </div>
                  </div>
                  
                  {deal.product_set && (
                    <p className="text-xs text-gray-500 mb-2 truncate">{deal.product_set}</p>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <p className="text-lg font-bold text-gray-900">€{deal.current_price.toFixed(2)}</p>
                    {deal.market_avg_price && (
                      <p className="text-xs text-gray-400">Avg €{deal.market_avg_price.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Browse more */}
            <div className="bg-gray-900 rounded-xl p-6 text-center">
              <h3 className="text-lg font-bold text-white mb-2">Looking for more deals?</h3>
              <p className="text-sm text-gray-400 mb-4">Browse our full collection of {dealScores.length}+ verified deals</p>
              <Link href="/deals" className="inline-block px-5 py-2 bg-white text-gray-900 text-sm rounded-lg font-medium hover:bg-gray-100 transition">
                Browse All Deals →
              </Link>
            </div>
          </>
        )}
      </div>

      {selectedDeal && <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
    </DashboardLayout>
  );
}
