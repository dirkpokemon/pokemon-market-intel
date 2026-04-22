'use client';

import { useEffect, useState, useMemo } from 'react';
import { marketApi, Signal, MarketDigest } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import CardImage from '@/components/CardImage';
import Link from 'next/link';
import { SUBSCRIBER_BADGE, UPSELL_SUBSCRIBE } from '@/lib/plans';
import SignalSetupWizard from '@/components/SignalSetupWizard';

// ─── Watchlist helpers ────────────────────────────────────────────────────────

function getWatchlistNames(): string[] {
  try { return JSON.parse(localStorage.getItem('signal_watchlist') || '[]'); } catch { return []; }
}
function toggleWatchlistName(name: string) {
  const list = getWatchlistNames();
  const updated = list.includes(name) ? list.filter(n => n !== name) : [...list, name];
  localStorage.setItem('signal_watchlist', JSON.stringify(updated));
  return updated.includes(name);
}

// ─── Action config per signal type ──────────────────────────────────────────

function getActionConfig(type: string): { label: string; hint: string; cta: string; ctaColor: string } {
  switch (type) {
    case 'momentum':
      return { label: 'Buying signal', hint: 'Price momentum is accelerating. Consider acting before the market adjusts upward.', cta: 'Find & buy', ctaColor: 'bg-green-600 hover:bg-green-700' };
    case 'price_drop':
      return { label: 'Price drop', hint: 'This card dropped in price. It could be a temporary dip or a correction. Good moment to buy if you believe in the card.', cta: 'Find & buy', ctaColor: 'bg-blue-600 hover:bg-blue-700' };
    case 'supply_drop':
      return { label: 'Supply tightening', hint: 'Fewer listings available. If demand holds, price will likely rise. Act quickly or add to watchlist.', cta: 'Check listings', ctaColor: 'bg-purple-600 hover:bg-purple-700' };
    case 'supply_surge':
      return { label: 'Supply surge', hint: 'Many new listings appeared. Price pressure may push values down, so waiting or negotiating can make sense.', cta: 'Monitor', ctaColor: 'bg-gray-600 hover:bg-gray-700' };
    case 'volatility':
      return { label: 'High volatility', hint: 'Unstable price movements. High risk: only buy if you have a short-term strategy.', cta: 'Check price', ctaColor: 'bg-amber-600 hover:bg-amber-700' };
    case 'risk':
      return { label: 'Risk alert', hint: 'Negative signals detected. Avoid buying now unless you have specific intel.', cta: 'Monitor', ctaColor: 'bg-red-600 hover:bg-red-700' };
    case 'set_rising':
      return { label: 'Set gaining value', hint: 'This set is trending upward. Look for deals within it before prices move higher.', cta: 'Browse set deals', ctaColor: 'bg-emerald-600 hover:bg-emerald-700' };
    case 'set_declining':
      return { label: 'Set losing value', hint: 'This set is trending downward. Wait for stabilisation before buying.', cta: 'Monitor set', ctaColor: 'bg-rose-600 hover:bg-rose-700' };
    case 'market_mover':
      return { label: 'Price movement', hint: 'Meaningful 7-day price change vs the start of the window. Not a full momentum/supply signal — use for watchlists and context.', cta: 'Check price', ctaColor: 'bg-slate-600 hover:bg-slate-700' };
    case 'sustained_uptrend':
      return { label: 'Sustained uptrend', hint: 'Price rising consistently over both the past week AND month. Strong multi-timeframe conviction — momentum is likely to continue.', cta: 'Find & buy', ctaColor: 'bg-teal-600 hover:bg-teal-700' };
    case 'consecutive_rising':
      return { label: '3 days rising', hint: 'Price increased every day for the last 3 days. Early momentum indicator — could be the start of a stronger trend. Good for watchlist.', cta: 'Add to watchlist', ctaColor: 'bg-orange-600 hover:bg-orange-700' };
    // Legacy types
    case 'high_deal':
      return { label: 'Strong deal', hint: 'Strong buying opportunity: price is clearly below market average.', cta: 'Find & buy', ctaColor: 'bg-green-600 hover:bg-green-700' };
    case 'medium_deal':
      return { label: 'Good deal', hint: 'Solid deal with price below market average. Worth checking if you need this card.', cta: 'Find & buy', ctaColor: 'bg-blue-600 hover:bg-blue-700' };
    case 'undervalued':
      return { label: 'Undervalued', hint: 'Card appears undervalued relative to comparable listings. Good potential buy.', cta: 'Find & buy', ctaColor: 'bg-indigo-600 hover:bg-indigo-700' };
    case 'arbitrage':
      return { label: 'Arbitrage', hint: 'Price gap detected between platforms. Buy low on one, potentially sell higher elsewhere.', cta: 'Check listings', ctaColor: 'bg-purple-600 hover:bg-purple-700' };
    default:
      return { label: 'Signal', hint: 'Review the data and decide based on your strategy.', cta: 'View', ctaColor: 'bg-gray-600 hover:bg-gray-700' };
  }
}

function cleanSearchName(name: string) {
  return name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*[-–]\s*(NM|LP|MP|HP|DMG|Near Mint|Lightly Played|Moderately Played|Heavily Played).*$/i, '')
    .replace(/\s+(Special Illustration Rare|Full Art|Alt Art|Alternate Art|Rainbow Rare|Secret Rare|Ultra Rare|Hyper Rare|Double Rare|Illustration Rare|Promo)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SIGNAL_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  // Current signal types
  momentum:       { label: 'Momentum',       icon: '🚀', color: 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/40 dark:border-green-800' },
  risk:           { label: 'Risk',           icon: '⚠️',  color: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800' },
  price_drop:     { label: 'Price Drop',     icon: '📉', color: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-800' },
  supply_surge:   { label: 'Supply Surge',   icon: '📦', color: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800' },
  supply_drop:    { label: 'Supply Drop',    icon: '🔒', color: 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-950/40 dark:border-purple-800' },
  volatility:     { label: 'Volatile',       icon: '🎢', color: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800' },
  set_rising:     { label: 'Set Rising',     icon: '📈', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800' },
  set_declining:  { label: 'Set Declining',  icon: '📉', color: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800' },
  market_mover:      { label: 'Market mover',   icon: '〰️', color: 'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-950/40 dark:border-slate-700' },
  sustained_uptrend: { label: 'Sustained Rise', icon: '📊', color: 'text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-300 dark:bg-teal-950/40 dark:border-teal-800' },
  consecutive_rising: { label: '3 Days Rising', icon: '🔥', color: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-800' },
  // Legacy signal types (still in DB from older analysis runs)
  high_deal:      { label: 'Strong Deal',    icon: '⭐', color: 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/40 dark:border-green-800' },
  medium_deal:    { label: 'Good Deal',      icon: '✅', color: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800' },
  undervalued:    { label: 'Undervalued',    icon: '💎', color: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800' },
  arbitrage:      { label: 'Arbitrage',      icon: '🔄', color: 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-950/40 dark:border-purple-800' },
};

function getTypeMeta(type: string) {
  return SIGNAL_TYPE_META[type] || { label: type.replace(/_/g, ' '), icon: '📊', color: 'text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700' };
}

function getLevelConfig(level: string) {
  switch (level) {
    case 'high': return { badge: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200', dot: 'bg-red-500', barColor: '#ef4444', label: 'High priority' };
    case 'medium': return { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200', dot: 'bg-amber-500', barColor: '#f59e0b', label: 'Medium priority' };
    default: return { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200', dot: 'bg-blue-500', barColor: '#3b82f6', label: 'Low priority' };
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isSetLevelSignal(s: Signal) {
  return s.category === 'set_trend';
}

// ─── Signal Card ────────────────────────────────────────────

function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(() => getWatchlistNames().includes(signal.product_name));

  const meta = getTypeMeta(signal.signal_type);
  const level = getLevelConfig(signal.signal_level);
  const action = getActionConfig(signal.signal_type);
  const isSetSignal = signal.category === 'set_trend';

  let parsedMeta: Record<string, any> = {};
  try { if (signal.signal_metadata) parsedMeta = JSON.parse(signal.signal_metadata); } catch {}

  const searchName = cleanSearchName(signal.product_name);
  const cardMarketUrl = `https://www.cardmarket.com/en/Pokemon/Products/Singles?searchString=${encodeURIComponent(searchName)}&sortBy=price_asc&minCondition=2`;
  const cardTraderUrl = `https://www.cardtrader.com/en/games/pokemon/blueprints_search?q=${encodeURIComponent(searchName)}`;
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchName + ' Pokemon card')}&_sacat=183454&LH_BIN=1&_sop=15`;
  const setDealsUrl = signal.product_set ? `/deals?set=${encodeURIComponent(signal.product_set)}` : '/deals';
  const cardDealsUrl = `/deals?card=${encodeURIComponent(signal.product_name)}`;

  const handleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowIn = toggleWatchlistName(signal.product_name);
    setInWatchlist(nowIn);
  };

  // Build stats for the compact block (max 3 shown)
  const stats: { label: string; value: string; tone?: 'up' | 'down' | 'neutral' }[] = [];
  if (parsedMeta.avg_trend !== undefined) {
    stats.push({ label: 'Price trend', value: `${parsedMeta.avg_trend >= 0 ? '+' : ''}${parsedMeta.avg_trend}%`, tone: parsedMeta.avg_trend >= 0 ? 'up' : 'down' });
  } else if (parsedMeta.price_trend !== undefined) {
    stats.push({ label: 'Price trend', value: `${parsedMeta.price_trend >= 0 ? '+' : ''}${parsedMeta.price_trend}%`, tone: parsedMeta.price_trend >= 0 ? 'up' : 'down' });
  }
  if (parsedMeta.avg_volume_trend !== undefined) {
    stats.push({ label: 'Volume trend', value: `${parsedMeta.avg_volume_trend >= 0 ? '+' : ''}${parsedMeta.avg_volume_trend}%`, tone: parsedMeta.avg_volume_trend >= 0 ? 'up' : 'down' });
  } else if (parsedMeta.volume_trend !== undefined) {
    stats.push({ label: 'Volume trend', value: `${parsedMeta.volume_trend >= 0 ? '+' : ''}${parsedMeta.volume_trend}%`, tone: parsedMeta.volume_trend >= 0 ? 'up' : 'down' });
  }
  if (parsedMeta.card_count !== undefined) {
    stats.push({ label: 'Sample size', value: `${parsedMeta.card_count} cards` });
  }
  if (parsedMeta.volatility !== undefined && stats.length < 3) {
    stats.push({ label: 'Volatility', value: `${parsedMeta.volatility}%` });
  }
  if (signal.current_price && stats.length < 3) {
    stats.push({ label: 'Price', value: `\u20AC${signal.current_price.toFixed(2)}` });
  }
  if (signal.market_avg_price && signal.market_avg_price !== signal.current_price && stats.length < 3) {
    stats.push({ label: 'Market avg', value: `\u20AC${signal.market_avg_price.toFixed(2)}` });
  }

  const subtitle = isSetSignal
    ? `Set trend${parsedMeta.card_count ? ` \u00B7 ${parsedMeta.card_count} cards analyzed` : ''}`
    : signal.product_set || meta.label;

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 transition ${expanded ? 'shadow-sm' : 'hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: level.barColor }}
    >
      {/* ── Compact header ── */}
      <div className="p-5">
        {/* Header row: text left, card image right (card signals only) */}
        <div className="flex items-start gap-4">
          {/* Left: all the text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0" aria-hidden>{meta.icon}</span>
                <h4 className="text-base font-bold text-gray-900 dark:text-white truncate">{signal.product_name}</h4>
              </div>
              <div className="flex flex-col items-end sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-[11px] text-gray-500 dark:text-gray-400 flex-shrink-0">
                <span className="whitespace-nowrap">{level.label}</span>
                {signal.confidence != null && (
                  <span className="hidden sm:inline whitespace-nowrap">
                    <span className="mx-1 opacity-40">·</span>
                    {Math.round(Number(signal.confidence))}% confidence
                  </span>
                )}
                <span className="whitespace-nowrap">
                  <span className="mr-1 opacity-40 sm:inline hidden">·</span>
                  {timeAgo(signal.detected_at)}
                </span>
              </div>
            </div>

            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-3">
              {subtitle} <span className="text-gray-300 dark:text-gray-600">·</span> <span className="text-gray-500 dark:text-gray-400">{meta.label}</span>
            </p>
          </div>

          {/* Right: card image for single-card signals */}
          {!isSetSignal && (
            <div className="flex-shrink-0 rounded-lg overflow-hidden w-16 h-[88px] bg-gray-100 dark:bg-gray-800">
              <CardImage cardName={signal.product_name} size="xl" />
            </div>
          )}
        </div>

        {/* Stats block */}
        {stats.length > 0 && (
          <div className="flex flex-wrap gap-x-8 gap-y-2 mb-3 px-3.5 py-3 rounded-lg bg-gray-50 dark:bg-white/5">
            {stats.slice(0, 3).map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{s.label}</span>
                <span className={`text-sm font-semibold ${
                  s.tone === 'up' ? 'text-emerald-600 dark:text-emerald-400'
                  : s.tone === 'down' ? 'text-rose-600 dark:text-rose-400'
                  : 'text-gray-900 dark:text-white'
                }`}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Advice line */}
        <p className="text-sm italic text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{action.hint}</p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isSetSignal ? (
            <Link
              href={setDealsUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              View {signal.product_set || 'set'} deals
            </Link>
          ) : (
            <Link
              href={cardDealsUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              View deals
            </Link>
          )}

          <button
            onClick={handleWatchlist}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition ${
              inWatchlist
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800 dark:hover:bg-amber-950/60'
                : 'bg-transparent text-gray-700 border-gray-200 hover:bg-gray-50 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={inWatchlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            {inWatchlist ? 'Watching' : 'Watch'}
          </button>

          {!isSetSignal && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {expanded ? 'Hide links ↑' : 'More links ↓'}
            </button>
          )}
        </div>
      </div>

      {/* ── External links panel (expanded) ── */}
      {expanded && !isSetSignal && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
            Detected: {new Date(signal.detected_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            {signal.deal_score != null && (
              <span className="ml-2 text-gray-600 dark:text-gray-400">\u00B7 deal score {Math.round(signal.deal_score)}</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={cardDealsUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Deal-scores (app)
            </Link>
            <a href={cardMarketUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-700 transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              CardMarket
            </a>
            <a href={cardTraderUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-gray-800 hover:bg-gray-900 transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              CardTrader
            </a>
            <a href={ebayUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-amber-500 hover:bg-amber-600 transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              eBay
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function PriceSignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [digest, setDigest] = useState<MarketDigest | null>(null);
  const [digestLoaded, setDigestLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  /** Feed scope: card-level signals vs set-level (set_trend) */
  const [scope, setScope] = useState<'all' | 'cards' | 'sets'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }
    const userData = localStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      setUser(u);
      // Show setup banner for paid users who haven't configured signals
      const isUserPaid = u?.role === 'paid' || u?.role === 'pro' || u?.role === 'admin';
      const setupDone = localStorage.getItem('signals_setup_done');
      if (isUserPaid && !setupDone) setShowSetupBanner(true);
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setAccessDenied(false);
      setDigestLoaded(false);
      // Digest hits heavy DB paths; load in background so signals UI is not blocked
      marketApi
        .getMarketDigest()
        .then((d) => setDigest(d))
        .catch(() => setDigest(null))
        .finally(() => setDigestLoaded(true));

      try {
        const s = await marketApi.getSignals({ limit: 100 });
        setSignals(s);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        if (status === 403) setAccessDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const scopedSignals = useMemo(() => {
    if (scope === 'cards') return signals.filter((s) => !isSetLevelSignal(s));
    if (scope === 'sets') return signals.filter((s) => isSetLevelSignal(s));
    return signals;
  }, [signals, scope]);

  const typeCountsInScope = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scopedSignals) {
      m.set(s.signal_type, (m.get(s.signal_type) || 0) + 1);
    }
    return m;
  }, [scopedSignals]);

  const filteredSignals = useMemo(() => {
    return scopedSignals.filter((signal) => {
      const typeMatch = filterType === 'all' || signal.signal_type === filterType;
      const searchMatch =
        !searchQuery ||
        signal.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (signal.product_set || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.signal_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (signal.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && searchMatch;
    });
  }, [scopedSignals, filterType, searchQuery]);

  const signalTypes = useMemo(
    () => Array.from(new Set(scopedSignals.map((s) => s.signal_type))).sort(),
    [scopedSignals]
  );
  const isPaid = user?.role === 'paid' || user?.role === 'pro' || user?.role === 'admin';

  const STALE_HOURS = 25;

  // Newest *signal row* timestamp (can stay old if no patterns matched this run)
  const newestSignalAge = useMemo(() => {
    if (signals.length === 0) return null;
    const newest = signals.reduce((a, b) =>
      new Date(a.detected_at) > new Date(b.detected_at) ? a : b
    );
    return (Date.now() - new Date(newest.detected_at).getTime()) / 3600000;
  }, [signals]);

  // True pipeline freshness: last market-stats run (from digest), not signal timestamps alone
  const analysisIsFresh = useMemo(() => {
    const at = digest?.last_analysis_at;
    if (!at) return false;
    const ageHours = (Date.now() - new Date(at).getTime()) / 3600000;
    return ageHours <= STALE_HOURS;
  }, [digest?.last_analysis_at]);

  const scrapeIsFresh = useMemo(() => {
    const at = digest?.last_scrape_at;
    if (!at) return false;
    const ageHours = (Date.now() - new Date(at).getTime()) / 3600000;
    return ageHours <= STALE_HOURS;
  }, [digest?.last_scrape_at]);

  const signalsAreStale =
    digestLoaded &&
    newestSignalAge !== null &&
    newestSignalAge > STALE_HOURS &&
    !analysisIsFresh;

  const stalePipelineHint = useMemo(() => {
    if (!scrapeIsFresh) {
      return 'There is no recent data in raw_prices (scraper). On Railway, deploy the scraper service (root services/scraper), set DATABASE_URL to this same database, and your CardTrader/API env vars.';
    }
    return 'Listings are being scraped, but market_statistics are not updating. On Railway, run the analysis service with root services/analysis, start command python -m app.main, and DATABASE_URL pointing to this same database (postgresql://… from Postgres).';
  }, [scrapeIsFresh]);

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Signals</h1>
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200 text-[11px] font-bold rounded-md uppercase tracking-wide">{SUBSCRIBER_BADGE}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Real-time market signals: momentum shifts, supply changes, set trends, and risk patterns.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Signal setup banner — shown to paid users who haven't configured notifications */}
        {showSetupBanner && !loading && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3.5 mb-6">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-xl flex-shrink-0">🔔</span>
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  Ontvang signals als ze binnenkomen
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Stel in via welk kanaal je alerts wil — email, Telegram of WhatsApp. Duurt minder dan een minuut.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 pl-8 sm:pl-0">
              <button
                onClick={() => setShowSetupWizard(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition"
              >
                Instellen →
              </button>
              <button
                onClick={() => {
                  setShowSetupBanner(false);
                  localStorage.setItem('signals_setup_done', '1');
                }}
                className="px-3 py-2 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 text-sm transition"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {/* Stale data warning */}
        {signalsAreStale && !loading && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-3 mb-6">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Signals are outdated</p>
              <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                The newest signal is {newestSignalAge && newestSignalAge > 48
                  ? `${Math.round(newestSignalAge / 24)} days`
                  : `${Math.round(newestSignalAge ?? 0)} hours`} old, and market statistics have not been refreshed in the last {STALE_HOURS} hours.
                {' '}
                {stalePipelineHint}
              </p>
            </div>
          </div>
        )}

        {/* Subscriber gate */}
        {(!isPaid || accessDenied) && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Unlock Signals</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Track momentum shifts, supply changes, volatility spikes, and set-level trends. Updated every hour.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Momentum tracking', icon: '🚀' },
                    { label: 'Supply monitoring', icon: '📦' },
                    { label: 'Set trends', icon: '📈' },
                    { label: 'Risk warnings', icon: '⚠️' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span>{f.icon}</span>
                      <span className="text-xs font-medium">{f.label}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                  {UPSELL_SUBSCRIBE}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 dark:border-gray-600 dark:border-t-gray-200 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading market data...</p>
            </div>
          </div>
        ) : accessDenied && signals.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <svg className="w-16 h-16 text-indigo-200 dark:text-indigo-800 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Signals need Plus or Business</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Upgrade your account to access real-time market signals.</p>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">
              {UPSELL_SUBSCRIBE}
            </Link>
          </div>
        ) : (
          <>
            {/* ─── Market Digest Row ─────────────────────── */}
            {digest && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cards Tracked</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{digest.total_cards_tracked.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{digest.total_sets} sets</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Listings</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{digest.total_listings.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">across all sources</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Signals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{signals.length}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{Object.keys(digest.signal_counts).length} categories</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Analysis</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {digest.last_analysis_at ? timeAgo(digest.last_analysis_at) : 'Pending'}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">updates every hour</p>
                </div>
              </div>
            )}

            {/* ─── Filters: scope (cards vs sets) + search + type (counts = this page only) ─── */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6 space-y-4">
              <div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">View</p>
                <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800/80">
                  {(
                    [
                      { id: 'all' as const, label: 'All' },
                      { id: 'cards' as const, label: 'Singles' },
                      { id: 'sets' as const, label: 'Sets' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setScope(id);
                        setFilterType('all');
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                        scope === id
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white dark:shadow-none'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {label}
                      <span className="ml-1 tabular-nums text-[10px] font-normal text-gray-400">
                        (
                        {id === 'all'
                          ? signals.length
                          : id === 'cards'
                            ? signals.filter((s) => !isSetLevelSignal(s)).length
                            : signals.filter((s) => isSetLevelSignal(s)).length}
                        )
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px] relative">
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search card, set, or description…"
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-transparent min-w-[180px]"
                >
                  <option value="all">All types ({scopedSignals.length})</option>
                  {signalTypes.map((type) => {
                    const meta = getTypeMeta(type);
                    const n = typeCountsInScope.get(type) ?? 0;
                    return (
                      <option key={type} value={type}>
                        {meta.label} ({n})
                      </option>
                    );
                  })}
                </select>
                {(filterType !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType('all');
                      setSearchQuery('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Counts apply to this feed (max. 100 signals), not the entire database.
              </p>
            </div>

            {/* ─── Signal Feed ───────────────────────────── */}
            {filteredSignals.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No signals found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filterType !== 'all' || searchQuery
                    ? 'Try adjusting your filters'
                    : 'Signals will appear after the next analysis cycle (runs every hour)'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSignals.slice(0, 60).map(signal => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}

            {filteredSignals.length > 60 && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                Showing 60 of {filteredSignals.length} signals
              </p>
            )}
          </>
        )}
      </div>

      {/* Signal Setup Wizard modal */}
      {showSetupWizard && (
        <SignalSetupWizard
          onClose={() => setShowSetupWizard(false)}
          onDone={() => {
            setShowSetupWizard(false);
            setShowSetupBanner(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}
