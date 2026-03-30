'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { marketApi, searchApi, newsApi, Signal, DealScore, CardSearchResult, NewsArticle } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/StatCard';
import DealModal from '@/components/DealModal';
import CardImage from '@/components/CardImage';
import OnboardingTour from '@/components/OnboardingTour';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [dealScores, setDealScores] = useState<DealScore[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<DealScore | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Full catalog search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CardSearchResult[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'listings'>('relevance');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // News state
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

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

      // Fetch news in background
      try {
        const articles = await newsApi.getNews(8);
        setNews(articles);
      } catch (err) {
        console.log('News unavailable');
      } finally {
        setNewsLoading(false);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
      setNewsLoading(false);
    }
  };

  const topDeals = dealScores.slice(0, 5);
  const recentSignals = signals.slice(0, 3);
  const excellentDeals = dealScores.filter(d => d.deal_score >= 80).length;
  const avgDealScore = dealScores.length > 0 
    ? Math.round(dealScores.reduce((sum, d) => sum + d.deal_score, 0) / dealScores.length)
    : 0;

  // Full catalog search via API (171K+ cards)
  const executeSearch = useCallback(async (query: string, sort: string = 'relevance') => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchActive(false);
      return;
    }
    try {
      setSearchLoading(true);
      setSearchActive(true);
      const response = await searchApi.search({
        q: query.trim(),
        limit: 20,
        sort_by: sort as any,
      });
      setSearchResults(response.results);
      setSearchTotal(response.total_results);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
      setSearchTotal(0);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounced auto-search while typing (300ms delay)
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setSearchActive(false);
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      executeSearch(value, sortBy);
    }, 400);
  };

  const handleSearch = () => {
    executeSearch(searchQuery, sortBy);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') {
      setSearchQuery('');
      setSearchActive(false);
      setSearchResults([]);
      setSearchTotal(0);
    }
  };

  // Convert a search result to a DealScore-compatible object for the modal
  const searchResultToDeal = (result: CardSearchResult): DealScore => ({
    id: 0,
    product_name: result.card_name,
    product_set: result.card_set || undefined,
    category: undefined,
    current_price: result.min_price,
    market_avg_price: result.avg_price,
    deal_score: result.deal_score || 0,
    confidence: undefined,
    calculated_at: result.last_seen,
  });

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
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {displayName}! 👋
              </h1>
              <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening in the EU Pokémon market today.</p>
            </div>

            {/* ═══ Market Search (TOP) ═══ */}
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
                      onChange={(e) => handleSearchInput(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search any Pokémon card, set, or product..."
                      className="w-full pl-12 pr-10 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => { setSearchQuery(''); setSearchActive(false); setSearchResults([]); setSearchTotal(0); }}
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
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-8 gap-3">
                        <div className="w-5 h-5 border-2 border-gray-600 border-t-green-400 rounded-full animate-spin" />
                        <p className="text-gray-400 text-sm">Searching 171,000+ cards...</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">No results found for &quot;{searchQuery}&quot;</p>
                        <p className="text-gray-600 text-xs mt-1">Try a different card name or set</p>
                      </div>
                    ) : (
                      <>
                        {/* Results header with count + sort */}
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-gray-500">
                            <span className="text-green-400 font-semibold">{searchTotal.toLocaleString()}</span> cards found
                            {searchTotal > 20 && <span className="text-gray-600"> · showing top 20</span>}
                          </p>
                          <div className="flex items-center gap-2">
                            {(['relevance', 'price_asc', 'price_desc', 'listings'] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => { setSortBy(s); executeSearch(searchQuery, s); }}
                                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                                  sortBy === s
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                              >
                                {s === 'relevance' ? '🔥 Relevant' : s === 'price_asc' ? '↑ Price' : s === 'price_desc' ? '↓ Price' : '📦 Listings'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Results list */}
                        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                          {searchResults.map((result, idx) => (
                            <div
                              key={`${result.card_name}-${result.card_set}-${idx}`}
                              onClick={() => setSelectedDeal(searchResultToDeal(result))}
                              className="flex items-center gap-4 p-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl cursor-pointer transition group"
                            >
                              {/* Card image */}
                              <CardImage cardName={result.card_name} size="sm" />

                              {/* Card info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-white truncate group-hover:text-green-300 transition">
                                  {result.card_name}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {result.card_set && (
                                    <p className="text-xs text-gray-500 truncate">{result.card_set}</p>
                                  )}
                                  <span className="text-[10px] text-gray-600">·</span>
                                  <span className="text-[11px] text-gray-500">
                                    {result.listings} listing{result.listings !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Price range + deal score */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <p className="text-base font-bold text-white">€{result.min_price.toFixed(2)}</p>
                                  {result.avg_price > result.min_price && (
                                    <p className="text-[11px] text-gray-500">
                                      avg €{result.avg_price.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                                {result.deal_score ? (
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    result.deal_score >= 80 ? 'bg-green-500/20' : result.deal_score >= 70 ? 'bg-amber-500/20' : 'bg-gray-700/50'
                                  }`}>
                                    <span className={`text-sm font-bold ${
                                      result.deal_score >= 80 ? 'text-green-400' : result.deal_score >= 70 ? 'text-amber-400' : 'text-gray-400'
                                    }`}>
                                      {result.deal_score}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-700/30">
                                    <span className="text-[10px] text-gray-600">—</span>
                                  </div>
                                )}
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

              </div>
            </div>

            {/* Key Metrics */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Your Market at a Glance</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Deals" value={dealScores.length} subtitle="Active opportunities" icon="🎴" color="blue" />
                <StatCard title="Avg Deal Score" value={avgDealScore} subtitle="Market average" icon="📊" color="purple" trend={{ value: 12, label: 'vs last week', isPositive: true }} />
                <StatCard title="Excellent Deals" value={excellentDeals} subtitle="Score 80+" icon="⭐" color="green" />
                <StatCard title="Active Signals" value={signals.length} subtitle="Real-time alerts" icon="🎯" color="blue" />
              </div>
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
                      <div className="flex items-start justify-between mb-3">
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
                      <div className="flex items-start gap-3">
                        <CardImage cardName={signal.product_name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{signal.product_name}</h3>
                          <p className="text-xs text-gray-500 mb-2">{signal.signal_type.replace(/_/g, ' ')}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">€{signal.current_price?.toFixed(2) || 'N/A'}</span>
                            {signal.deal_score && (
                              <span className="font-bold text-green-700">Score: {signal.deal_score}</span>
                            )}
                          </div>
                        </div>
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
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <CardImage cardName={deal.product_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-semibold text-gray-900 flex-1 line-clamp-2 pr-2 group-hover:text-gray-700 transition">{deal.product_name}</h3>
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
                          <p className="text-xs text-gray-500 mt-1 truncate">{deal.product_set}</p>
                        )}
                      </div>
                    </div>
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

            {/* ═══ Pokémon TCG News ═══ */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Latest Pokémon News</h2>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase">Live</span>
                </div>
              </div>

              {newsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-20 h-14 bg-gray-100 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-100 rounded w-3/4" />
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : news.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {news.map((article, idx) => (
                    <a
                      key={idx}
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition group"
                    >
                      <div className="flex items-start gap-3">
                        {article.image_url ? (
                          <img
                            src={article.image_url}
                            alt=""
                            className="w-20 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-20 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">📰</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition">
                            {article.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[11px] text-gray-400 font-medium">{article.source}</span>
                            {article.published && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-[11px] text-gray-400">
                                  {(() => {
                                    try {
                                      const d = new Date(article.published);
                                      const now = new Date();
                                      const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
                                      if (diffH < 1) return 'Just now';
                                      if (diffH < 24) return `${diffH}h ago`;
                                      const diffD = Math.floor(diffH / 24);
                                      if (diffD === 1) return 'Yesterday';
                                      if (diffD < 7) return `${diffD}d ago`;
                                      return d.toLocaleDateString();
                                    } catch { return ''; }
                                  })()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">No news articles available right now.</p>
                  <p className="text-xs text-gray-400 mt-1">Check back soon for the latest Pokémon TCG updates.</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/portfolio" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">📦</div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition">My Portfolio</h3>
                    <p className="text-xs text-gray-500">Collection & watchlist</p>
                  </div>
                </div>
              </Link>
              <Link href="/signals" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">⚡</div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition">Price Signals</h3>
                    <p className="text-xs text-gray-500">AI-powered market intel</p>
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
