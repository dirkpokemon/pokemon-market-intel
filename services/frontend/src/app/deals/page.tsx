'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { marketApi, DealScore } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import DealModal from '@/components/DealModal';
import CardImage from '@/components/CardImage';
import { isSubscriberRole } from '@/lib/plans';

type ViewMode = 'all' | 'watchlist';

interface FilterOptions {
  search: string;
  minScore: number;
  maxScore: number;
  minPrice: number;
  maxPrice: number;
}

const FREE_VISIBLE = 3;

function DealCard({ deal, watchlist, toggleWatchlist, setSelectedDeal, getScoreColor, getScoreBg }: {
  deal: DealScore;
  watchlist: number[];
  toggleWatchlist: (id: number) => void;
  setSelectedDeal: (d: DealScore) => void;
  getScoreColor: (s: number) => string;
  getScoreBg: (s: number) => string;
}) {
  const savingsPercent = deal.market_avg_price
    ? Math.round((1 - deal.current_price / deal.market_avg_price) * 100)
    : 0;

  return (
    <div
      onClick={() => setSelectedDeal(deal)}
      className="rounded-xl overflow-hidden bg-gray-950 dark:bg-gray-950 border border-gray-800 hover:border-gray-600 transition cursor-pointer group"
    >
      {/* ── Card art section ── */}
      <div className="relative h-52 bg-gray-900 overflow-hidden">
        {/* Image centered, contained */}
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <CardImage cardName={deal.product_name} size="xl" className="max-h-full" />
        </div>

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent pointer-events-none" />

        {/* Top-left: savings badge */}
        {savingsPercent > 5 && (
          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow-sm">
            -{savingsPercent}%
          </div>
        )}

        {/* Top-right: watchlist */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleWatchlist(deal.id); }}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition text-sm"
        >
          {watchlist.includes(deal.id) ? '⭐' : '☆'}
        </button>

        {/* Bottom: card name overlaid on gradient */}
        <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3 z-10">
          <h3 className="text-sm font-bold text-white line-clamp-1 leading-snug">{deal.product_name}</h3>
          {deal.product_set && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{deal.product_set}</p>
          )}
        </div>
      </div>

      {/* ── Price + score row ── */}
      <div className="px-3.5 py-3 flex items-center justify-between bg-gray-950">
        <div>
          <p className="text-lg font-bold text-white">&euro;{deal.current_price.toFixed(2)}</p>
          {deal.market_avg_price && savingsPercent > 0 && (
            <p className="text-[11px] text-gray-500 line-through">&euro;{deal.market_avg_price.toFixed(2)} avg</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg ${getScoreBg(deal.deal_score)} flex items-center justify-center`}>
          <span className={`text-sm font-bold ${getScoreColor(deal.deal_score)}`}>{deal.deal_score}</span>
        </div>
      </div>
    </div>
  );
}

function DealsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetSet = (searchParams.get('set') || '').trim();
  const presetCard = (searchParams.get('card') || '').trim();

  const [loading, setLoading] = useState(true);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<DealScore | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('score-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [userRole, setUserRole] = useState<string>('free');
  const [filters, setFilters] = useState<FilterOptions>({
    search: presetSet || presetCard,
    minScore: presetSet || presetCard ? 0 : 50,
    maxScore: 100,
    minPrice: 0,
    maxPrice: 1000,
  });

  const dealsPerPage = 12;

  useEffect(() => {
    const savedWatchlist = localStorage.getItem('watchlist');
    if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
    const raw = localStorage.getItem('user');
    if (raw) { try { setUserRole(JSON.parse(raw).role || 'free'); } catch {} }
  }, []);

  useEffect(() => {
    const setP = (searchParams.get('set') || '').trim();
    const cardP = (searchParams.get('card') || '').trim();
    setFilters((prev) => ({
      ...prev,
      search: setP || cardP ? setP || cardP : '',
      minScore: setP || cardP ? 0 : 50,
    }));
    setCurrentPage(1);

    (async () => {
      try {
        setLoading(true);
        const scoped = Boolean(setP || cardP);
        const scores = await marketApi.getDealScores({
          limit: 100,
          min_score: scoped ? 0 : 50,
          ...(setP ? { product_set: setP } : {}),
          ...(cardP ? { product_name: cardP } : {}),
        });
        setDealScores(scores);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

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
    if (score >= 80) return 'text-green-700 dark:text-green-400';
    if (score >= 70) return 'text-amber-700 dark:text-amber-400';
    return 'text-gray-600 dark:text-gray-300';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 dark:bg-green-950/50';
    if (score >= 70) return 'bg-amber-50 dark:bg-amber-950/50';
    return 'bg-gray-50 dark:bg-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Top Deals
              {presetSet && (
                <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">· set: {presetSet}</span>
              )}
              {!presetSet && presetCard && (
                <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">· card: {presetCard}</span>
              )}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {presetSet || presetCard ? (
                <>
                  {dealScores.length} deal{dealScores.length !== 1 ? 's' : ''} loaded for this filter
                  {isSubscriberRole(userRole) ? ' · full list for subscribers' : ' · free: top 20 with score ≥55'}
                </>
              ) : isSubscriberRole(userRole) ? (
                `${dealScores.length} deals with AI scoring, refreshed hourly`
              ) : (
                `${FREE_VISIBLE} deals visible. Upgrade for full access.`
              )}
            </p>
          </div>
          {isSubscriberRole(userRole) && (
            <button
              onClick={() => { setViewMode(prev => prev === 'all' ? 'watchlist' : 'all'); setCurrentPage(1); }}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                viewMode === 'watchlist'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'
              }`}
            >
              {viewMode === 'watchlist' ? '⭐ Watchlist' : '📋 All Deals'}
              {viewMode === 'watchlist' && watchlist.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-600 text-white rounded text-xs">{watchlist.length}</span>
              )}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 dark:border-gray-600 dark:border-t-gray-200 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading deals...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
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
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                >
                  <option value="score-desc">Best Score</option>
                  <option value="price-asc">Lowest Price</option>
                  <option value="price-desc">Highest Price</option>
                  <option value="savings-desc">Best Savings</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="space-y-2 min-w-0">
                  <div className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>Min. score</span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{filters.minScore}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minScore}
                    onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value, 10) })}
                    className="app-range-input"
                    aria-label="Minimum deal score"
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <div className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>Min. price</span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">€{filters.minPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: parseInt(e.target.value, 10) })}
                    className="app-range-input"
                    aria-label="Minimum price in euros"
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <div className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>Max. price</span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">€{filters.maxPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value, 10) })}
                    className="app-range-input"
                    aria-label="Maximum price in euros"
                  />
                </div>
              </div>
            </div>

            {filteredAndSortedDeals.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Showing {filteredAndSortedDeals.length} {viewMode === 'watchlist' ? 'watchlist ' : ''}deal{filteredAndSortedDeals.length !== 1 ? 's' : ''}
              </p>
            )}

            {/* Deals Grid */}
            {filteredAndSortedDeals.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {viewMode === 'watchlist' ? 'Your watchlist is empty' : 'No deals found'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
                  {viewMode === 'watchlist'
                    ? 'Click the star on a deal to save it'
                    : dealScores.length > 0
                      ? 'Your filters exclude every loaded deal. Lower min. score or price, or clear the search field.'
                      : presetSet || presetCard
                        ? 'No scored deals match this set/card right now (free: score ≥55 only). Try all deals or check back later.'
                        : 'Adjust your search or filters'}
                </p>
                <button
                  onClick={() => {
                    setFilters({ search: '', minScore: 50, maxScore: 100, minPrice: 0, maxPrice: 1000 });
                    setViewMode('all');
                    setCurrentPage(1);
                    if (viewMode === 'watchlist') return;
                    router.replace('/deals');
                  }}
                  className="px-4 py-2 bg-gray-900 dark:bg-indigo-600 text-white text-sm rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-500 transition"
                >
                  {viewMode === 'watchlist' ? 'View all deals' : presetSet || presetCard ? 'Load all deals' : 'Reset filters'}
                </button>
              </div>
            ) : isSubscriberRole(userRole) ? (
              /* ── Subscribers: full paginated grid ── */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
                  {paginatedDeals.map((deal) => <DealCard key={deal.id} deal={deal} watchlist={watchlist} toggleWatchlist={toggleWatchlist} setSelectedDeal={setSelectedDeal} getScoreColor={getScoreColor} getScoreBg={getScoreBg} />)}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center gap-1 flex-wrap">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-3 py-1.5 text-sm border rounded-lg ${
                          currentPage === i + 1
                            ? 'bg-gray-900 dark:bg-indigo-600 text-white border-gray-900 dark:border-indigo-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* ── Free users: 3 visible + blur/lock ── */
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-2">
                  {filteredAndSortedDeals.slice(0, FREE_VISIBLE).map((deal) => (
                    <DealCard key={deal.id} deal={deal} watchlist={watchlist} toggleWatchlist={toggleWatchlist} setSelectedDeal={setSelectedDeal} getScoreColor={getScoreColor} getScoreBg={getScoreBg} />
                  ))}
                  {/* Blurred preview cards */}
                  {filteredAndSortedDeals.slice(FREE_VISIBLE, FREE_VISIBLE + 5).map((deal) => (
                    <div key={deal.id} className="select-none pointer-events-none blur-sm opacity-60">
                      <DealCard deal={deal} watchlist={[]} toggleWatchlist={() => {}} setSelectedDeal={() => {}} getScoreColor={getScoreColor} getScoreBg={getScoreBg} />
                    </div>
                  ))}
                </div>

                {/* Lock overlay */}
                {filteredAndSortedDeals.length > FREE_VISIBLE && (
                  <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent dark:from-gray-950 dark:via-gray-950/95 dark:to-transparent flex items-end justify-center pb-8 pointer-events-none">
                    <div className="pointer-events-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 px-8 py-6 text-center max-w-sm w-full mx-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                        {filteredAndSortedDeals.length - FREE_VISIBLE} deals hidden
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Upgrade to Plus for all {filteredAndSortedDeals.length} deals, refreshed hourly.
                      </p>
                      <Link
                        href="/pricing"
                        className="block w-full py-2.5 bg-gray-900 dark:bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-indigo-500 transition"
                      >
                        Upgrade to Plus
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {selectedDeal && <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
    </DashboardLayout>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={null}>
      <DealsPageInner />
    </Suspense>
  );
}
