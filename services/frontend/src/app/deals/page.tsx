'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { marketApi, DealScore } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
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

  const toggleWatchlist = (dealId: number) => {
    const newWatchlist = watchlist.includes(dealId)
      ? watchlist.filter(id => id !== dealId)
      : [...watchlist, dealId];
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  const filteredAndSortedDeals = useMemo(() => {
    let filtered = dealScores.filter(deal => {
      if (viewMode === 'watchlist' && !watchlist.includes(deal.id)) return false;
      const matchesSearch = !filters.search || 
        deal.product_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (deal.product_set?.toLowerCase().includes(filters.search.toLowerCase()) || false);
      const matchesScore = deal.deal_score >= filters.minScore && deal.deal_score <= filters.maxScore;
      const matchesPrice = deal.current_price >= filters.minPrice && deal.current_price <= filters.maxPrice;
      return matchesSearch && matchesScore && matchesPrice;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score-desc': return b.deal_score - a.deal_score;
        case 'price-asc': return a.current_price - b.current_price;
        case 'price-desc': return b.current_price - a.current_price;
        case 'savings-desc':
          const savA = a.market_avg_price ? (1 - a.current_price / a.market_avg_price) : 0;
          const savB = b.market_avg_price ? (1 - b.current_price / b.market_avg_price) : 0;
          return savB - savA;
        default: return 0;
      }
    });
    return filtered;
  }, [dealScores, filters, sortBy, viewMode, watchlist]);

  const totalPages = Math.ceil(filteredAndSortedDeals.length / dealsPerPage);
  const paginatedDeals = filteredAndSortedDeals.slice(
    (currentPage - 1) * dealsPerPage,
    currentPage * dealsPerPage
  );

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Top Deals</h1>
            <p className="text-sm text-gray-500 mt-1">Browse {dealScores.length} verified deals with AI-powered scoring</p>
          </div>
          <button
            onClick={() => { setViewMode(prev => prev === 'all' ? 'watchlist' : 'all'); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
              viewMode === 'watchlist'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {viewMode === 'watchlist' ? '⭐ Watchlist' : '📋 All Deals'}
            {viewMode === 'watchlist' && watchlist.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-amber-600 text-white rounded text-xs">{watchlist.length}</span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading deals...</p>
            </div>
          </div>
        ) : (
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
                    placeholder="Search cards or sets..."
                    value={filters.search}
                    onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                >
                  <option value="score-desc">Best Score</option>
                  <option value="price-asc">Lowest Price</option>
                  <option value="price-desc">Highest Price</option>
                  <option value="savings-desc">Best Savings</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-3 border-t border-gray-100">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Score: {filters.minScore}</label>
                  <input type="range" min="0" max="100" value={filters.minScore}
                    onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Price: €{filters.minPrice}</label>
                  <input type="range" min="0" max="1000" step="10" value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: parseInt(e.target.value) })} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Price: €{filters.maxPrice}</label>
                  <input type="range" min="0" max="1000" step="10" value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })} className="w-full" />
                </div>
              </div>
            </div>

            {filteredAndSortedDeals.length > 0 && (
              <p className="text-xs text-gray-500 mb-4">
                Showing {filteredAndSortedDeals.length} {viewMode === 'watchlist' ? 'watchlist ' : ''}deal{filteredAndSortedDeals.length !== 1 ? 's' : ''}
              </p>
            )}

            {/* Deals Grid */}
            {filteredAndSortedDeals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {viewMode === 'watchlist' ? 'Your watchlist is empty' : 'No deals match your filters'}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  {viewMode === 'watchlist' ? 'Click the star on any deal to save it' : 'Try adjusting your search or filters'}
                </p>
                <button
                  onClick={() => { setFilters({ search: '', minScore: 50, maxScore: 100, minPrice: 0, maxPrice: 1000 }); setViewMode('all'); }}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition"
                >
                  {viewMode === 'watchlist' ? 'Browse All Deals' : 'Reset Filters'}
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
                  {paginatedDeals.map((deal) => (
                    <div 
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition cursor-pointer group relative"
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleWatchlist(deal.id); }}
                        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition text-sm"
                      >
                        {watchlist.includes(deal.id) ? '⭐' : '☆'}
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-3 py-1.5 text-sm border rounded-lg ${
                          currentPage === i + 1 ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {selectedDeal && <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
    </DashboardLayout>
  );
}
