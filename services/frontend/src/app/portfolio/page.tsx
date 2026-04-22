'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchApi, CardSearchResult } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import CardImage from '@/components/CardImage';
import Sparkline from '@/components/Sparkline';
import { marketApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollectionCard {
  id: string;
  name: string;
  set?: string;
  quantity: number;
  purchasePrice: number;  // what you paid per card
  condition: string;
  addedAt: string;
  notes?: string;
}

interface WatchlistCard {
  id: string;
  name: string;
  set?: string;
  targetPrice: number;
  direction: 'below' | 'above';
  addedAt: string;
  notes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLLECTION_KEY = 'portfolio_collection';
const WATCHLIST_KEY = 'portfolio_watchlist';

const loadFromStorage = <T,>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveToStorage = <T,>(key: string, data: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* storage full or disabled */
  }
};

function safeListingPrice(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

type SortKey = 'pl-desc' | 'pl-asc' | 'value-desc' | 'name-asc';

export default function PortfolioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'collection' | 'watchlist' | 'valuate'>('collection');
  // currentPrices: card name → current market price (from targeted search)
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [collectionSort, setCollectionSort] = useState<SortKey>('value-desc');

  // Collection state
  const [collection, setCollection] = useState<CollectionCard[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardSearch, setAddCardSearch] = useState('');
  const [addCardResults, setAddCardResults] = useState<CardSearchResult[]>([]);
  const [addCardLoading, setAddCardLoading] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', set: '', quantity: 1, purchasePrice: 0, condition: 'NM', notes: '' });

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistCard[]>([]);
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [newWatch, setNewWatch] = useState({ name: '', set: '', targetPrice: 0, direction: 'below' as 'below' | 'above', notes: '' });
  const [watchSearch, setWatchSearch] = useState('');
  const [watchSearchResults, setWatchSearchResults] = useState<CardSearchResult[]>([]);
  const [watchSearchLoading, setWatchSearchLoading] = useState(false);

  // Valuate tab state
  interface ValuationItem { id: string; name: string; set?: string; price: number; quantity: number; }
  const [valuationItems, setValuationItems] = useState<ValuationItem[]>([]);
  const [valuateSearch, setValuateSearch] = useState('');
  const [valuateResults, setValuateResults] = useState<CardSearchResult[]>([]);
  const [valuateLoading, setValuateLoading] = useState(false);

  const addCardSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuateSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }

    const col = loadFromStorage<CollectionCard>(COLLECTION_KEY);
    const watch = loadFromStorage<WatchlistCard>(WATCHLIST_KEY);
    setCollection(col);
    setWatchlist(watch);

    // Fetch prices for all cards in collection + watchlist
    const allNames = [
      ...col.map(c => c.name),
      ...watch.map(w => w.name),
    ];
    if (allNames.length > 0) fetchMarketPrices(allNames);
  }, [router]);

  useEffect(() => {
    return () => {
      if (addCardSearchTimerRef.current) clearTimeout(addCardSearchTimerRef.current);
      if (watchSearchTimerRef.current) clearTimeout(watchSearchTimerRef.current);
      if (valuateSearchTimerRef.current) clearTimeout(valuateSearchTimerRef.current);
    };
  }, []);

  /**
   * Targeted price lookup: for each unique card name, search the API and
   * pick the first exact-name match. Much more accurate than loading 200
   * bulk deal scores, and works for any card regardless of deal score.
   */
  const fetchMarketPrices = async (cardNames: string[]) => {
    const uniqueNames = [...new Set(cardNames)];
    if (!uniqueNames.length) return;

    setLoading(true);
    const prices: Record<string, number> = {};

    // Batch in groups of 5 to avoid hammering the API
    const BATCH = 5;
    for (let i = 0; i < uniqueNames.length; i += BATCH) {
      const batch = uniqueNames.slice(i, i + BATCH);
      await Promise.all(batch.map(async (name) => {
        try {
          const res = await searchApi.search({ q: name, limit: 5, sort_by: 'price_asc' });
          const exact = res.results.find(r =>
            r.card_name.toLowerCase() === name.toLowerCase()
          ) || res.results[0];
          if (exact) prices[name] = safeListingPrice(exact.avg_price || exact.min_price);
        } catch { /* skip, leave price as purchasePrice */ }
      }));
    }

    setCurrentPrices(prices);
    setLastUpdated(new Date());
    setLoading(false);

    // Also fetch 7-day sparklines for collection cards
    if (uniqueNames.length > 0) {
      marketApi.getSparklines(uniqueNames, 7)
        .then(setSparklines)
        .catch(() => {});
    }
  };

  const refreshPrices = () => {
    const allNames = [
      ...collection.map(c => c.name),
      ...watchlist.map(w => w.name),
    ];
    if (allNames.length > 0) fetchMarketPrices(allNames);
  };

  // ─── Collection logic ───────────────────────────────────────────────────────

  const addToCollection = () => {
    if (!newCard.name.trim()) return;
    const snapshot = { ...newCard };
    const cardName = snapshot.name.trim();
    setCollection((prev) => {
      const card: CollectionCard = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: cardName,
        set: snapshot.set.trim() || undefined,
        quantity: Math.max(1, snapshot.quantity),
        purchasePrice: safeListingPrice(snapshot.purchasePrice),
        condition: snapshot.condition,
        addedAt: new Date().toISOString(),
        notes: snapshot.notes.trim() || undefined,
      };
      const next = [card, ...prev];
      saveToStorage(COLLECTION_KEY, next);
      return next;
    });
    // Fetch price for the newly added card if not already known
    if (!(cardName in currentPrices)) fetchMarketPrices([cardName]);
    setNewCard({ name: '', set: '', quantity: 1, purchasePrice: 0, condition: 'NM', notes: '' });
    setShowAddCard(false);
    setAddCardSearch('');
    setAddCardResults([]);
  };

  const removeFromCollection = (id: string) => {
    setCollection((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveToStorage(COLLECTION_KEY, next);
      return next;
    });
  };

  const selectCardFromSearch = (result: CardSearchResult) => {
    setNewCard(prev => ({
      ...prev,
      name: result.card_name,
      set: result.card_set || '',
      purchasePrice: safeListingPrice(result.min_price),
    }));
    setAddCardResults([]);
    setAddCardSearch('');
  };

  // Search for cards in collection add flow (debounced — avoids races and UI glitches)
  const searchForCard = useCallback((query: string) => {
    if (addCardSearchTimerRef.current) clearTimeout(addCardSearchTimerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setAddCardResults([]);
      setAddCardLoading(false);
      return;
    }
    addCardSearchTimerRef.current = setTimeout(async () => {
      try {
        setAddCardLoading(true);
        const res = await searchApi.search({ q, limit: 8 });
        setAddCardResults(res.results);
      } catch {
        setAddCardResults([]);
      } finally {
        setAddCardLoading(false);
      }
    }, 280);
  }, []);

  // Search for watchlist
  const searchForWatchCard = useCallback((query: string) => {
    if (watchSearchTimerRef.current) clearTimeout(watchSearchTimerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setWatchSearchResults([]);
      setWatchSearchLoading(false);
      return;
    }
    watchSearchTimerRef.current = setTimeout(async () => {
      try {
        setWatchSearchLoading(true);
        const res = await searchApi.search({ q, limit: 8 });
        setWatchSearchResults(res.results);
      } catch {
        setWatchSearchResults([]);
      } finally {
        setWatchSearchLoading(false);
      }
    }, 280);
  }, []);

  // Search for valuation tab
  const searchForValuateCard = useCallback((query: string) => {
    if (valuateSearchTimerRef.current) clearTimeout(valuateSearchTimerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setValuateResults([]);
      setValuateLoading(false);
      return;
    }
    valuateSearchTimerRef.current = setTimeout(async () => {
      try {
        setValuateLoading(true);
        const res = await searchApi.search({ q, limit: 8 });
        setValuateResults(res.results);
      } catch {
        setValuateResults([]);
      } finally {
        setValuateLoading(false);
      }
    }, 280);
  }, []);

  const addToValuation = (result: CardSearchResult) => {
    const price = safeListingPrice(result.min_price);
    setValuationItems(prev => {
      const existing = prev.find(i => i.name === result.card_name && (i.set || '') === (result.card_set || ''));
      if (existing) {
        return prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: result.card_name,
        set: result.card_set || undefined,
        price,
        quantity: 1,
      }];
    });
    setValuateSearch('');
    setValuateResults([]);
  };

  // ─── Watchlist logic ────────────────────────────────────────────────────────

  const addToWatchlist = () => {
    if (!newWatch.name.trim()) return;
    const snapshot = { ...newWatch };
    const cardName = snapshot.name.trim();
    setWatchlist((prev) => {
      const card: WatchlistCard = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: cardName,
        set: snapshot.set.trim() || undefined,
        targetPrice: safeListingPrice(snapshot.targetPrice),
        direction: snapshot.direction,
        addedAt: new Date().toISOString(),
        notes: snapshot.notes.trim() || undefined,
      };
      const next = [card, ...prev];
      saveToStorage(WATCHLIST_KEY, next);
      return next;
    });
    if (!(cardName in currentPrices)) fetchMarketPrices([cardName]);
    setNewWatch({ name: '', set: '', targetPrice: 0, direction: 'below', notes: '' });
    setShowAddWatch(false);
    setWatchSearch('');
    setWatchSearchResults([]);
  };

  const removeFromWatchlist = (id: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveToStorage(WATCHLIST_KEY, next);
      return next;
    });
  };

  const selectWatchCardFromSearch = (result: CardSearchResult) => {
    setNewWatch(prev => ({
      ...prev,
      name: result.card_name,
      set: result.card_set || '',
      targetPrice: safeListingPrice(result.min_price),
    }));
    setWatchSearchResults([]);
    setWatchSearch('');
  };

  // ─── Portfolio stats ────────────────────────────────────────────────────────

  // Match collection cards with current market prices
  const enrichedCollection = useMemo(() => {
    return collection.map(card => {
      const currentPrice = currentPrices[card.name] ?? card.purchasePrice;
      const hasMarketPrice = card.name in currentPrices;
      const totalInvested = card.purchasePrice * card.quantity;
      const totalValue = currentPrice * card.quantity;
      const profitLoss = totalValue - totalInvested;
      const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
      return { ...card, currentPrice, hasMarketPrice, totalInvested, totalValue, profitLoss, profitLossPct };
    });
  }, [collection, currentPrices]);

  const sortedCollection = useMemo(() => {
    const list = [...enrichedCollection];
    switch (collectionSort) {
      case 'pl-desc': return list.sort((a, b) => b.profitLoss - a.profitLoss);
      case 'pl-asc':  return list.sort((a, b) => a.profitLoss - b.profitLoss);
      case 'value-desc': return list.sort((a, b) => b.totalValue - a.totalValue);
      case 'name-asc': return list.sort((a, b) => a.name.localeCompare(b.name));
      default: return list;
    }
  }, [enrichedCollection, collectionSort]);

  // Match watchlist cards with current prices
  const enrichedWatchlist = useMemo(() => {
    return watchlist.map(card => {
      const currentPrice = currentPrices[card.name];
      const triggered = currentPrice !== undefined
        ? card.direction === 'below'
          ? currentPrice <= card.targetPrice
          : currentPrice >= card.targetPrice
        : false;
      return { ...card, currentPrice, triggered };
    });
  }, [watchlist, currentPrices]);

  const portfolioStats = useMemo(() => {
    const totalCards = enrichedCollection.reduce((sum, c) => sum + c.quantity, 0);
    const totalInvested = enrichedCollection.reduce((sum, c) => sum + c.totalInvested, 0);
    const totalValue = enrichedCollection.reduce((sum, c) => sum + c.totalValue, 0);
    const totalPL = totalValue - totalInvested;
    const plPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    const triggeredAlerts = enrichedWatchlist.filter(w => w.triggered).length;
    return { totalCards, totalInvested, totalValue, totalPL, plPct, watchlistCount: watchlist.length, triggeredAlerts };
  }, [enrichedCollection, enrichedWatchlist, watchlist.length]);

  const valuationTotal = useMemo(() =>
    valuationItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
  [valuationItems]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track your collection value and monitor price targets.
              {lastUpdated && (
                <span className="ml-2 text-xs text-gray-400">
                  Bijgewerkt {lastUpdated.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          {(collection.length > 0 || watchlist.length > 0) && (
            <button
              onClick={refreshPrices}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-40"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Laden…' : 'Prijzen verversen'}
            </button>
          )}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Cards</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{portfolioStats.totalCards}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{collection.length} unique</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Portfolio Value</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">&euro;{portfolioStats.totalValue.toFixed(2)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Invested: &euro;{portfolioStats.totalInvested.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit / Loss</p>
            <p className={`text-2xl font-bold ${portfolioStats.totalPL >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {portfolioStats.totalPL >= 0 ? '+' : ''}&euro;{portfolioStats.totalPL.toFixed(2)}
            </p>
            <p className={`text-[11px] mt-0.5 font-medium ${portfolioStats.plPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {portfolioStats.plPct >= 0 ? '+' : ''}{portfolioStats.plPct.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Watchlist</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{portfolioStats.watchlistCount}</p>
            {portfolioStats.triggeredAlerts > 0 && (
              <p className="text-[11px] mt-0.5 font-semibold text-green-600 dark:text-green-400">{portfolioStats.triggeredAlerts} alert{portfolioStats.triggeredAlerts !== 1 ? 's' : ''} triggered!</p>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-800 mb-6">
          <button
            onClick={() => setActiveTab('collection')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'collection'
                ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            My Collection
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded">{collection.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'watchlist'
                ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            My Watchlist
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded">{watchlist.length}</span>
            {portfolioStats.triggeredAlerts > 0 && (
              <span className="ml-1 w-2 h-2 bg-green-500 rounded-full inline-block" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('valuate')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'valuate'
                ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Waardebepaling
            {valuationItems.length > 0 && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded">{valuationItems.length}</span>
            )}
          </button>
        </div>

        {/* ════════════ COLLECTION TAB ════════════ */}
        {activeTab === 'collection' && (
          <>
            {/* Add Card Button + Sort */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                {collection.length > 0 ? `Jouw kaarten (${collection.length})` : 'Start je collectie'}
              </h2>
              <div className="flex items-center gap-2">
                {collection.length > 1 && (
                  <select
                    value={collectionSort}
                    onChange={e => setCollectionSort(e.target.value as SortKey)}
                    className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  >
                    <option value="value-desc">Hoogste waarde</option>
                    <option value="pl-desc">Beste P&L</option>
                    <option value="pl-asc">Slechtste P&L</option>
                    <option value="name-asc">Naam A–Z</option>
                  </select>
                )}
                <button
                  onClick={() => setShowAddCard(!showAddCard)}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Kaart toevoegen
                </button>
              </div>
            </div>

            {/* Add Card Form */}
            {showAddCard && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6 overflow-visible">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Add a card to your collection</h3>
                
                {/* Search to find card */}
                <div className="relative z-50 mb-4">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Search card</label>
                  <input
                    type="text"
                    value={addCardSearch}
                    onChange={(e) => { setAddCardSearch(e.target.value); searchForCard(e.target.value); }}
                    placeholder="Type to search (e.g. Charizard ex)..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                  />
                  {addCardLoading && (
                    <div className="absolute right-3 top-8">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
                    </div>
                  )}
                  {addCardResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {addCardResults.map((r) => (
                        <button
                          key={`${r.card_name}|${r.card_set ?? ''}|${r.last_seen}`}
                          type="button"
                          onClick={() => selectCardFromSearch(r)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left border-b border-gray-50 dark:border-gray-800 last:border-0"
                        >
                          <CardImage cardName={r.card_name} size="xs" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.card_name}</p>
                            {r.card_set && <p className="text-[11px] text-gray-400 truncate">{r.card_set}</p>}
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">&euro;{safeListingPrice(r.min_price).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Card name *</label>
                    <input
                      type="text"
                      value={newCard.name}
                      onChange={(e) => setNewCard(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Charizard ex"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Set</label>
                    <input
                      type="text"
                      value={newCard.set}
                      onChange={(e) => setNewCard(p => ({ ...p, set: e.target.value }))}
                      placeholder="e.g. Obsidian Flames"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Qty</label>
                    <input
                      type="number"
                      value={newCard.quantity}
                      onChange={(e) => setNewCard(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                      min="1"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Purchase price (&euro;)</label>
                    <input
                      type="number"
                      value={newCard.purchasePrice || ''}
                      onChange={(e) => setNewCard(p => ({ ...p, purchasePrice: parseFloat(e.target.value) || 0 }))}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Condition</label>
                    <select
                      value={newCard.condition}
                      onChange={(e) => setNewCard(p => ({ ...p, condition: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                    >
                      <option value="NM">Near Mint (NM)</option>
                      <option value="LP">Lightly Played (LP)</option>
                      <option value="MP">Moderately Played (MP)</option>
                      <option value="HP">Heavily Played (HP)</option>
                      <option value="DMG">Damaged (DMG)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Notes (optional)</label>
                    <input
                      type="text"
                      value={newCard.notes}
                      onChange={(e) => setNewCard(p => ({ ...p, notes: e.target.value }))}
                      placeholder="e.g. First edition, graded PSA 9..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => { setShowAddCard(false); setAddCardResults([]); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                    Cancel
                  </button>
                  <button
                    onClick={addToCollection}
                    disabled={!newCard.name.trim()}
                    className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add to Collection
                  </button>
                </div>
              </div>
            )}

            {/* Collection Cards */}
            {collection.length === 0 && !showAddCard ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Your collection is empty</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Add cards you own to track their value over time.</p>
                <button
                  onClick={() => setShowAddCard(true)}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
                >
                  Add your first card
                </button>
              </div>
            ) : collection.length > 0 && (
              <div className="space-y-2">
                {sortedCollection.map((card) => (
                  <div key={card.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition">
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Card image */}
                      <CardImage cardName={card.name} size="sm" />

                      {/* Card info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{card.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {card.set && <span className="text-[11px] text-gray-400 truncate max-w-[120px]">{card.set}</span>}
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded font-medium">{card.condition}</span>
                          <span className="text-[11px] text-gray-400">&times;{card.quantity}</span>
                        </div>
                        {/* Sparkline trend */}
                        {sparklines[card.name] && sparklines[card.name].length >= 2 && (
                          <div className="mt-1.5">
                            <Sparkline data={sparklines[card.name]} width={72} height={18} showChange />
                          </div>
                        )}
                      </div>

                      {/* Paid per card */}
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-[11px] text-gray-400">Betaald</p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">&euro;{card.purchasePrice.toFixed(2)}</p>
                      </div>

                      {/* Current market price */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] text-gray-400">Markt</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          &euro;{card.currentPrice.toFixed(2)}
                        </p>
                        {!card.hasMarketPrice && (
                          <p className="text-[9px] text-gray-400">±aankoopprijs</p>
                        )}
                      </div>

                      {/* P&L */}
                      <div className="text-right flex-shrink-0 min-w-[72px]">
                        <p className="text-[11px] text-gray-400">P&amp;L</p>
                        <p className={`text-sm font-bold ${card.profitLoss >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {card.profitLoss >= 0 ? '+' : ''}&euro;{card.profitLoss.toFixed(2)}
                        </p>
                        <p className={`text-[10px] font-semibold ${card.profitLossPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {card.profitLossPct >= 0 ? '+' : ''}{card.profitLossPct.toFixed(1)}%
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCollection(card.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition rounded flex-shrink-0"
                        title="Verwijder uit collectie"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════════ WATCHLIST TAB ════════════ */}
        {activeTab === 'watchlist' && (
          <>
            {/* Add Watch Button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                {watchlist.length > 0 ? 'Your Watchlist' : 'Start Watching Cards'}
              </h2>
              <button
                onClick={() => setShowAddWatch(!showAddWatch)}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to Watchlist
              </button>
            </div>

            {/* Add Watch Form */}
            {showAddWatch && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6 overflow-visible">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Set a price target</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Get notified when the card reaches your target price</p>
                
                {/* Search to find card */}
                <div className="relative z-50 mb-4">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Search card</label>
                  <input
                    type="text"
                    value={watchSearch}
                    onChange={(e) => { setWatchSearch(e.target.value); searchForWatchCard(e.target.value); }}
                    placeholder="Type to search..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                  />
                  {watchSearchLoading && (
                    <div className="absolute right-3 top-8">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
                    </div>
                  )}
                  {watchSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {watchSearchResults.map((r) => (
                        <button
                          key={`${r.card_name}|${r.card_set ?? ''}|${r.last_seen}`}
                          type="button"
                          onClick={() => selectWatchCardFromSearch(r)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left border-b border-gray-50 dark:border-gray-800 last:border-0"
                        >
                          <CardImage cardName={r.card_name} size="xs" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.card_name}</p>
                            {r.card_set && <p className="text-[11px] text-gray-400 truncate">{r.card_set}</p>}
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">&euro;{safeListingPrice(r.min_price).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Card name *</label>
                    <input
                      type="text"
                      value={newWatch.name}
                      onChange={(e) => setNewWatch(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Pikachu V"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Target price (&euro;)</label>
                    <input
                      type="number"
                      value={newWatch.targetPrice || ''}
                      onChange={(e) => setNewWatch(p => ({ ...p, targetPrice: parseFloat(e.target.value) || 0 }))}
                      step="0.01"
                      min="0"
                      placeholder="25.00"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Notify me when</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewWatch(p => ({ ...p, direction: 'below' }))}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition ${
                          newWatch.direction === 'below'
                            ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-950/40 dark:border-green-700 dark:text-green-300'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                      >
                        ↓ Below
                      </button>
                      <button
                        onClick={() => setNewWatch(p => ({ ...p, direction: 'above' }))}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition ${
                          newWatch.direction === 'above'
                            ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                      >
                        ↑ Above
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => { setShowAddWatch(false); setWatchSearchResults([]); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                    Cancel
                  </button>
                  <button
                    onClick={addToWatchlist}
                    disabled={!newWatch.name.trim() || !newWatch.targetPrice}
                    className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add to Watchlist
                  </button>
                </div>
              </div>
            )}

            {/* Watchlist Cards */}
            {watchlist.length === 0 && !showAddWatch ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Your watchlist is empty</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Watch cards you want to buy and set target prices to get notified.</p>
                <button
                  onClick={() => setShowAddWatch(true)}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
                >
                  Watch your first card
                </button>
              </div>
            ) : watchlist.length > 0 && (
              <div className="space-y-2">
                {enrichedWatchlist.map((card) => (
                  <div
                    key={card.id}
                    className={`bg-white dark:bg-gray-900 rounded-xl border p-4 transition ${
                      card.triggered
                        ? 'border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/25'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Status icon */}
                      {card.triggered ? (
                        <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      )}

                      {/* Card image */}
                      <CardImage cardName={card.name} size="sm" />

                      {/* Card info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{card.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Alert when price {card.direction === 'below' ? 'drops below' : 'goes above'}{' '}
                          <span className="font-semibold">&euro;{card.targetPrice.toFixed(2)}</span>
                        </p>
                        {card.set && <p className="text-[11px] text-gray-400 mt-0.5">{card.set}</p>}
                      </div>

                      {/* Current price */}
                      {card.currentPrice !== undefined && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-[11px] text-gray-400">Current</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">&euro;{card.currentPrice.toFixed(2)}</p>
                        </div>
                      )}

                      {/* Status badge */}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded flex-shrink-0 ${
                        card.triggered
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {card.triggered ? '🎯 TRIGGERED' : 'WATCHING'}
                      </span>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromWatchlist(card.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition rounded flex-shrink-0"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA to browse deals */}
            {watchlist.length > 0 && (
              <div className="mt-6 bg-gray-900 rounded-xl p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2">Looking for more cards?</h3>
                <p className="text-sm text-gray-400 mb-4">Browse deals and add interesting cards to your watchlist</p>
                <Link href="/deals" className="inline-block px-5 py-2 bg-white text-gray-900 text-sm rounded-lg font-medium hover:bg-gray-100 transition">
                  Browse Top Deals →
                </Link>
              </div>
            )}
          </>
        )}

        {/* ════════════ WAARDEBEPALING TAB ════════════ */}
        {activeTab === 'valuate' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Waardebepaling</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bereken de marktwaarde van losse kaarten op basis van live EU-data.</p>
              </div>
              {valuationItems.length > 0 && (
                <button
                  onClick={() => setValuationItems([])}
                  className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                >
                  Alles wissen
                </button>
              )}
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Zoek een kaart om toe te voegen</label>
              <div className="relative z-30">
                <input
                  type="text"
                  value={valuateSearch}
                  onChange={e => { setValuateSearch(e.target.value); searchForValuateCard(e.target.value); }}
                  placeholder="Bijv. Charizard ex, Pikachu V…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none pr-8"
                />
                {valuateLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
                  </div>
                )}
                {valuateResults.length > 0 && (
                  <div className="absolute z-40 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {valuateResults.map(r => (
                      <button
                        key={`${r.card_name}|${r.card_set ?? ''}|${r.last_seen}`}
                        type="button"
                        onClick={() => addToValuation(r)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left border-b border-gray-50 dark:border-gray-800 last:border-0"
                      >
                        <CardImage cardName={r.card_name} size="xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.card_name}</p>
                          {r.card_set && <p className="text-[11px] text-gray-400 truncate">{r.card_set}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">€{safeListingPrice(r.min_price).toFixed(2)}</p>
                          <p className="text-[10px] text-gray-400">marktprijs</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Valuation list */}
            {valuationItems.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Nog geen kaarten toegevoegd</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Zoek hierboven naar kaarten om hun huidige marktwaarde te berekenen.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {valuationItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                      <div className="flex items-center gap-3">
                        <CardImage cardName={item.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                          {item.set && <p className="text-[11px] text-gray-400 truncate">{item.set}</p>}
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">€{item.price.toFixed(2)} per stuk</p>
                        </div>
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setValuationItems(prev =>
                              prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i)
                            )}
                            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-base leading-none"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
                          <button
                            onClick={() => setValuationItems(prev =>
                              prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
                            )}
                            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-base leading-none"
                          >
                            +
                          </button>
                        </div>
                        {/* Subtotal */}
                        <div className="text-right flex-shrink-0 min-w-[72px]">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">€{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        {/* Remove */}
                        <button
                          onClick={() => setValuationItems(prev => prev.filter(i => i.id !== item.id))}
                          className="p-1.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition rounded flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-5 border border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Geschatte marktwaarde</p>
                      <p className="text-[11px] text-gray-500">
                        {valuationItems.reduce((s, i) => s + i.quantity, 0)} kaart{valuationItems.reduce((s, i) => s + i.quantity, 0) !== 1 ? 'en' : ''} · op basis van laagste EU-listings
                      </p>
                    </div>
                    <p className="text-3xl font-black text-white">€{valuationTotal.toFixed(2)}</p>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

    </DashboardLayout>
  );
}
