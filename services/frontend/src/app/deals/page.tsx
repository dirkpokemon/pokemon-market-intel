'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { marketApi, DealScore } from '@/lib/api';
import MainNav from '@/components/MainNav';
import DealModal from '@/components/DealModal';

type ViewMode = 'all' | 'watchlist';

interface FilterOptions {
  search: string;
  minScore: number;
  maxScore: number;
  minPrice: number;
  maxPrice: number;
}

export default function DealsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<DealScore | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('score-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    minScore: 50,
    maxScore: 100,
    minPrice: 0,
    maxPrice: 1000,
  });

  const dealsPerPage = 12;

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
    const newWatchlist = watchlist.includes(dealId)
      ? watchlist.filter(id => id !== dealId)
      : [...watchlist, dealId];
    
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  // Filter and sort deals
  const filteredAndSortedDeals = useMemo(() => {
    let filtered = dealScores.filter(deal => {
      if (viewMode === 'watchlist' && !watchlist.includes(deal.id)) {
        return false;
      }

      const matchesSearch = !filters.search || 
        deal.product_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (deal.product_set?.toLowerCase().includes(filters.search.toLowerCase()) || false);
      
      const matchesScore = deal.deal_score >= filters.minScore && deal.deal_score <= filters.maxScore;
      const matchesPrice = deal.current_price >= filters.minPrice && deal.current_price <= filters.maxPrice;
      
      return matchesSearch && matchesScore && matchesPrice;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score-desc':
          return b.deal_score - a.deal_score;
        case 'price-asc':
          return a.current_price - b.current_price;
        case 'price-desc':
          return b.current_price - a.current_price;
        case 'savings-desc':
          const savingsA = a.market_avg_price ? (1 - a.current_price / a.market_avg_price) : 0;
          const savingsB = b.market_avg_price ? (1 - b.current_price / b.market_avg_price) : 0;
          return savingsB - savingsA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [dealScores, filters, sortBy, viewMode, watchlist]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDeals.length / dealsPerPage);
  const paginatedDeals = filteredAndSortedDeals.slice(
    (currentPage - 1) * dealsPerPage,
    currentPage * dealsPerPage
  );

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
            <div className="animate-spin text-6xl mb-4">💎</div>
            <p className="text-gray-600">Loading top deals...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💎 Top Deals</h1>
          <p className="text-gray-600">Browse {dealScores.length} verified deals with AI-powered scoring</p>
        </div>

        {/* Filters & Sort */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <input
                type="text"
                placeholder="Search cards or sets..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="score-desc">Best Score</option>
                <option value="price-asc">Lowest Price</option>
                <option value="price-desc">Highest Price</option>
                <option value="savings-desc">Best Savings</option>
              </select>
            </div>

            {/* View Mode */}
            <div>
              <button
                onClick={() => {
                  setViewMode(prev => prev === 'all' ? 'watchlist' : 'all');
                  setCurrentPage(1);
                }}
                className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                  viewMode === 'watchlist'
                    ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {viewMode === 'watchlist' ? '⭐ Watchlist' : '📋 All Deals'}
                {viewMode === 'watchlist' && watchlist.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-600 text-white rounded-full text-xs">
                    {watchlist.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Score: {filters.minScore}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Price: €{filters.minPrice}
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price: €{filters.maxPrice}
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Results Summary */}
        {filteredAndSortedDeals.length > 0 && (
          <div className="mb-6 text-center">
            <p className="text-gray-700 font-semibold">
              Showing {filteredAndSortedDeals.length} {viewMode === 'watchlist' ? 'watchlist' : ''} deal{filteredAndSortedDeals.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Deals Grid */}
        {filteredAndSortedDeals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">{viewMode === 'watchlist' ? '⭐' : '🔍'}</div>
            <p className="text-lg font-bold text-gray-900 mb-2">
              {viewMode === 'watchlist' ? 'Your watchlist is empty' : 'No deals match your filters'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {viewMode === 'watchlist' 
                ? 'Click the star icon on any deal to add it to your watchlist'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  minScore: 60,
                  maxScore: 100,
                  minPrice: 0,
                  maxPrice: 1000,
                });
                setViewMode('all');
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              {viewMode === 'watchlist' ? 'Browse All Deals' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {paginatedDeals.map((deal) => (
                <div 
                  key={deal.id} 
                  onClick={() => setSelectedDeal(deal)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition cursor-pointer group relative"
                >
                  {/* Watchlist Star */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(deal.id);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
                  >
                    <span className="text-xl">
                      {watchlist.includes(deal.id) ? '⭐' : '☆'}
                    </span>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                          currentPage === pageNum 
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-4 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
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
