'use client';

import { useEffect, useState } from 'react';
import { DealScore } from '@/lib/api';
import CardImage from '@/components/CardImage';

interface DealModalProps {
  deal: DealScore;
  onClose: () => void;
}

function buildInsight(deal: DealScore): { verdict: string; label: string; color: string; insight: string } {
  const discount = deal.market_avg_price && deal.market_avg_price > 0
    ? Math.round((1 - deal.current_price / deal.market_avg_price) * 100)
    : null;

  const pctText = discount !== null && discount > 0
    ? `${discount}% below the market average`
    : discount !== null && discount < 0
    ? `${Math.abs(discount)}% above the market average`
    : null;

  if (deal.deal_score >= 80) {
    return {
      verdict: 'Strong buy',
      label: 'bg-green-100 text-green-800',
      color: 'border-green-200 bg-green-50',
      insight: pctText
        ? `This card is listed ${pctText} with a deal score of ${deal.deal_score} — one of the stronger opportunities in the current catalog.`
        : `Deal score of ${deal.deal_score} is well above average. Price data suggests this is a solid buying opportunity.`,
    };
  }
  if (deal.deal_score >= 65) {
    return {
      verdict: 'Good deal',
      label: 'bg-blue-100 text-blue-800',
      color: 'border-blue-100 bg-blue-50',
      insight: pctText
        ? `Listed ${pctText}. A good deal — competitive pricing relative to the EU market.`
        : `Deal score of ${deal.deal_score} indicates good value. Price is competitive in the current market.`,
    };
  }
  if (deal.deal_score >= 50) {
    return {
      verdict: 'Fair price',
      label: 'bg-gray-100 text-gray-700',
      color: 'border-gray-200 bg-gray-50',
      insight: pctText
        ? `Listed ${pctText}. The score of ${deal.deal_score} is moderate — not a standout deal, but a fair price.`
        : `Score of ${deal.deal_score} is around average. Nothing exceptional, but priced reasonably.`,
    };
  }
  return {
    verdict: 'Skip for now',
    label: 'bg-amber-100 text-amber-800',
    color: 'border-amber-100 bg-amber-50',
    insight: pctText
      ? `Price is ${pctText}. Score of ${deal.deal_score} suggests better deals may be available elsewhere in the catalog.`
      : `Score of ${deal.deal_score} is below average. Consider looking at other deals in this set.`,
  };
}

// Position of current price on a bar between estimated low and high
function getPriceBarPosition(deal: DealScore): { pct: number; low: number; high: number } | null {
  if (!deal.market_avg_price || deal.market_avg_price <= 0) return null;
  const low = Math.min(deal.current_price, deal.market_avg_price) * 0.85;
  const high = Math.max(deal.current_price, deal.market_avg_price) * 1.15;
  const pct = Math.max(2, Math.min(98, ((deal.current_price - low) / (high - low)) * 100));
  return { pct, low, high };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function DealModal({ deal, onClose }: DealModalProps) {
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      try {
        setInWatchlist(JSON.parse(saved).includes(deal.id));
      } catch {}
    }
    // Close on Escape
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deal.id, onClose]);

  const toggleWatchlist = () => {
    const saved = localStorage.getItem('watchlist');
    const list: number[] = saved ? JSON.parse(saved) : [];
    const updated = inWatchlist ? list.filter(id => id !== deal.id) : [...list, deal.id];
    localStorage.setItem('watchlist', JSON.stringify(updated));
    setInWatchlist(!inWatchlist);
  };

  const { verdict, label, color, insight } = buildInsight(deal);
  const bar = getPriceBarPosition(deal);
  const savings = deal.market_avg_price && deal.market_avg_price > 0
    ? Math.round((1 - deal.current_price / deal.market_avg_price) * 100)
    : null;

  const scoreColor =
    deal.deal_score >= 80 ? 'text-green-700' :
    deal.deal_score >= 65 ? 'text-blue-700' :
    deal.deal_score >= 50 ? 'text-gray-700' : 'text-amber-700';

  const cardMarketUrl = `https://www.cardmarket.com/en/Pokemon/Products/Singles?searchString=${encodeURIComponent(deal.product_name)}`;
  const cardTraderUrl = `https://www.cardtrader.com/en/pokemon/search?utf8=%E2%9C%93&q=${encodeURIComponent(deal.product_name)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-gray-100 shadow-sm transition text-gray-500 hover:text-gray-900"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="overflow-y-auto max-h-[90vh]">
          {/* ── Top section: image + identity + verdict ── */}
          <div className="flex gap-5 p-6 pb-0">
            {/* Card image */}
            <div className="flex-shrink-0">
              <CardImage
                cardName={deal.product_name}
                size="lg"
                className="!w-28 !h-40 shadow-md"
              />
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start gap-2 flex-wrap mb-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${label}`}>
                  {verdict}
                </span>
                {deal.product_set && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {deal.product_set}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-900 leading-tight mb-3 pr-8">
                {deal.product_name}
              </h2>

              {/* Price block */}
              <div className="flex items-end gap-4 flex-wrap mb-3">
                <div>
                  <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Current price</p>
                  <p className="text-4xl font-bold text-gray-900 leading-none">
                    €{deal.current_price.toFixed(2)}
                  </p>
                </div>
                {deal.market_avg_price && deal.market_avg_price > 0 && (
                  <div className="pb-1">
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Market avg</p>
                    <p className="text-xl font-semibold text-gray-500">
                      €{deal.market_avg_price.toFixed(2)}
                    </p>
                  </div>
                )}
                {savings !== null && savings !== 0 && (
                  <div className="pb-1">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                      savings > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {savings > 0 ? `${savings}% below avg` : `${Math.abs(savings)}% above avg`}
                    </span>
                  </div>
                )}
              </div>

              {/* Price range bar */}
              {bar && (
                <div className="mb-1">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Est. low €{bar.low.toFixed(2)}</span>
                    <span>Est. high €{bar.high.toFixed(2)}</span>
                  </div>
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-visible">
                    <div
                      className="absolute h-2 rounded-full bg-gradient-to-r from-green-400 to-green-300"
                      style={{ width: `${bar.pct}%` }}
                    />
                    {/* Price marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-gray-800 rounded-full shadow"
                      style={{ left: `${bar.pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Price position relative to market average
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Insight block ── */}
          <div className={`mx-6 mt-4 rounded-xl border p-4 ${color}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">What this means</p>
            <p className="text-sm text-gray-800 leading-relaxed">{insight}</p>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-3 gap-3 mx-6 mt-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Deal score</p>
              <p className={`text-2xl font-bold ${scoreColor}`}>{deal.deal_score}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Confidence</p>
              <p className="text-2xl font-bold text-gray-800">
                {deal.confidence != null ? `${deal.confidence}%` : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Last updated</p>
              <p className="text-xs font-semibold text-gray-700 leading-tight mt-1">
                {formatDate(deal.calculated_at)}
              </p>
            </div>
          </div>

          {/* ── Buy links ── */}
          <div className="mx-6 mt-4">
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-2">Find this card</p>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={cardMarketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                CardMarket
              </a>
              <a
                href={cardTraderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white text-sm font-semibold rounded-xl hover:bg-gray-900 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                CardTrader
              </a>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              Links open a search for this card on the respective platform.
            </p>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 mt-4 border-t border-gray-100">
            <button
              onClick={toggleWatchlist}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                inWatchlist
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill={inWatchlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {inWatchlist ? 'In watchlist' : 'Add to watchlist'}
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
