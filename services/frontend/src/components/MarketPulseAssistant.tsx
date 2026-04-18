'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { DealScore, MarketDigest } from '@/lib/api';

const PriceChart = dynamic(() => import('@/components/PriceChart'), { ssr: false });

export type PulseMarketSnapshot = {
  totalProducts: number;
  avgPrice: number;
  avgScore: number;
  buying: Array<DealScore & { delta: number }>;
  overpriced: Array<DealScore & { delta: number }>;
  topSets: Array<{ name: string; count: number; avgScore: number; avgPrice: number }>;
  ranges: { under5: number; range5to20: number; range20to50: number; over50: number };
  scoreDistribution: { excellent: number; good: number; fair: number; low: number };
};

type PillId =
  | 'snapshot'
  | 'priceVsAvg'
  | 'topSets'
  | 'trends7d'
  | 'scoreMix'
  | 'priceSpread'
  | 'priceBuckets';

type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; pillId: PillId }
  | { id: string; role: 'assistant'; hint: string };

const PILLS: { id: PillId; label: string; subscriberOnly?: boolean }[] = [
  { id: 'snapshot',    label: "What's happening in the market?" },
  { id: 'priceVsAvg', label: 'Which cards are below avg price?' },
  { id: 'topSets',    label: 'Show me the top sets right now' },
  { id: 'trends7d',   label: 'Which sets are trending up this week?' },
  { id: 'scoreMix',   label: 'How are deal scores distributed?' },
  { id: 'priceSpread', label: 'Show me the price spread' },
  { id: 'priceBuckets', label: 'Break down by price range', subscriberOnly: true },
];

function AssistantCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 shadow-sm overflow-hidden text-left">
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
        <p className="text-xs font-semibold text-gray-300">{title}</p>
      </div>
      <div className="p-3 text-sm text-gray-200">{children}</div>
      {footer ? (
        <div className="px-3 py-2 bg-gray-900 border-t border-gray-800 text-[10px] text-gray-500">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function renderAssistantBody(
  pillId: PillId,
  ctx: {
    marketData: PulseMarketSnapshot;
    visibleDeals: DealScore[];
    digest: MarketDigest | null;
    isSubscriber: boolean;
    selectedSetLabel: string;
    lastUpdatedLine: string | null;
  }
) {
  const { marketData, visibleDeals, digest, isSubscriber, selectedSetLabel, lastUpdatedLine } = ctx;
  const scopeNote = selectedSetLabel ? `Filter: set "${selectedSetLabel}".` : 'All sets in this data slice.';
  const sourceFooter = (
    <span>
      Source: scored deals in this view
      {lastUpdatedLine ? ` · ${lastUpdatedLine}` : ''}
    </span>
  );

  switch (pillId) {
    case 'snapshot':
      return (
        <AssistantCard title="Market overview" footer={sourceFooter}>
          <p className="text-xs text-gray-400 mb-3">{scopeNote}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gray-800 p-3 text-center">
              <p className="text-xl font-bold text-white">{marketData.totalProducts}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Listings tracked</p>
            </div>
            <div className="rounded-lg bg-gray-800 p-3 text-center">
              <p className="text-xl font-bold text-white">€{marketData.avgPrice.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Avg. price</p>
            </div>
            <div className="rounded-lg bg-gray-800 p-3 text-center">
              <p className="text-xl font-bold text-white">{marketData.avgScore}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Avg. deal score</p>
            </div>
            <div className="rounded-lg bg-gray-800 p-3 text-center">
              <p className="text-xl font-bold text-white">
                {digest?.total_sets != null ? digest.total_sets.toLocaleString() : '—'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Sets in catalog</p>
            </div>
          </div>
        </AssistantCard>
      );
    case 'priceVsAvg':
      return (
        <AssistantCard title="Cards below market average" footer={sourceFooter}>
          <p className="text-xs text-gray-400 mb-2">
            Deepest discounts (listing below its own market average). Tap any card to view in Deals.
          </p>
          <ul className="space-y-2 max-h-52 overflow-y-auto">
            {marketData.buying.slice(0, 8).map((d) => (
              <li key={d.id}>
                <Link
                  href={`/deals?card=${encodeURIComponent(d.product_name)}`}
                  className="flex justify-between gap-2 text-xs hover:text-emerald-400 transition"
                >
                  <span className="truncate font-medium text-gray-200">{d.product_name}</span>
                  <span className="text-emerald-400 shrink-0 font-semibold">{d.delta.toFixed(1)}%</span>
                </Link>
              </li>
            ))}
          </ul>
          {marketData.buying.length === 0 && (
            <p className="text-xs text-gray-500">No rows with market average for this selection.</p>
          )}
        </AssistantCard>
      );
    case 'topSets':
      return (
        <AssistantCard title="Top sets in this view" footer={sourceFooter}>
          <ul className="space-y-2">
            {marketData.topSets.slice(0, 6).map((s, i) => (
              <li key={s.name} className="flex justify-between gap-2 text-xs">
                <span className="text-gray-600 w-4">{i + 1}</span>
                {s.name !== 'Unknown' ? (
                  <Link href={`/deals?set=${encodeURIComponent(s.name)}`} className="flex-1 truncate font-medium text-emerald-400 hover:underline">
                    {s.name}
                  </Link>
                ) : (
                  <span className="flex-1 truncate text-gray-500">{s.name}</span>
                )}
                <span className="text-gray-500 shrink-0">{s.count} deals</span>
              </li>
            ))}
          </ul>
        </AssistantCard>
      );
    case 'trends7d':
      if (!digest?.top_rising_sets?.length && !digest?.top_declining_sets?.length) {
        return (
          <AssistantCard title="Set trends (7d)" footer={sourceFooter}>
            <p className="text-xs text-gray-500">No trend data available yet.</p>
          </AssistantCard>
        );
      }
      return (
        <AssistantCard title="Set trends (7d)" footer={sourceFooter}>
          <p className="text-xs text-gray-400 mb-2">From market statistics — broader than the deal leaderboard alone.</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-emerald-400 mb-2">📈 Rising</p>
              <ul className="space-y-1.5">
                {(digest.top_rising_sets || []).slice(0, 4).map((t) => (
                  <li key={t.product_set} className="flex justify-between gap-2">
                    <Link href={`/deals?set=${encodeURIComponent(t.product_set)}`} className="truncate text-gray-300 hover:text-emerald-400 transition">
                      {t.product_set}
                    </Link>
                    <span className="text-emerald-400 font-medium shrink-0">+{t.avg_trend}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-rose-400 mb-2">📉 Declining</p>
              <ul className="space-y-1.5">
                {(digest.top_declining_sets || []).slice(0, 4).map((t) => (
                  <li key={t.product_set} className="flex justify-between gap-2">
                    <Link href={`/deals?set=${encodeURIComponent(t.product_set)}`} className="truncate text-gray-300 hover:text-rose-400 transition">
                      {t.product_set}
                    </Link>
                    <span className="text-rose-400 font-medium shrink-0">{t.avg_trend}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </AssistantCard>
      );
    case 'scoreMix':
      if (!isSubscriber) {
        return (
          <AssistantCard title="Score distribution" footer={sourceFooter}>
            <p className="text-xs text-gray-400 mb-3">Full distribution across all score buckets is available on Plus.</p>
            <Link href="/pricing" className="inline-flex text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition">
              Upgrade to Plus
            </Link>
          </AssistantCard>
        );
      }
      return (
        <AssistantCard title="Score distribution" footer={sourceFooter}>
          <div className="space-y-2.5">
            {[
              { label: '80+ Excellent', count: marketData.scoreDistribution.excellent, color: 'bg-emerald-500' },
              { label: '55–79 Good', count: marketData.scoreDistribution.good, color: 'bg-blue-500' },
              { label: '50–54 Fair', count: marketData.scoreDistribution.fair, color: 'bg-gray-500' },
              { label: '<50 Low', count: marketData.scoreDistribution.low, color: 'bg-gray-700' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-[11px] mb-1 text-gray-300">
                  <span>{row.label}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{ width: `${Math.max(4, (row.count / Math.max(1, marketData.totalProducts)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AssistantCard>
      );
    case 'priceSpread':
      return (
        <AssistantCard title="Price spread" footer={sourceFooter}>
          <p className="text-xs text-gray-400 mb-2">Distribution of listing prices in this slice.</p>
          <div className="h-[200px] w-full">
            <PriceChart deals={visibleDeals.slice(0, isSubscriber ? 100 : 20)} />
          </div>
        </AssistantCard>
      );
    case 'priceBuckets':
      if (!isSubscriber) {
        return (
          <AssistantCard title="Price range breakdown" footer={sourceFooter}>
            <p className="text-xs text-gray-400 mb-3">Available on Plus.</p>
            <Link href="/pricing" className="inline-flex text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition">
              Upgrade to Plus
            </Link>
          </AssistantCard>
        );
      }
      return (
        <AssistantCard title="Price range breakdown" footer={sourceFooter}>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            {[
              { label: '< €5', n: marketData.ranges.under5 },
              { label: '€5–€20', n: marketData.ranges.range5to20 },
              { label: '€20–€50', n: marketData.ranges.range20to50 },
              { label: '> €50', n: marketData.ranges.over50 },
            ].map((b) => (
              <div key={b.label} className="rounded-lg bg-gray-800 py-3">
                <p className="text-lg font-bold text-white">{b.n}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{b.label}</p>
              </div>
            ))}
          </div>
        </AssistantCard>
      );
    default:
      return null;
  }
}

export default function MarketPulseAssistant({
  marketData,
  visibleDeals,
  digest,
  isSubscriber,
  lastUpdatedLine,
  selectedSetLabel,
  className,
}: {
  marketData: PulseMarketSnapshot;
  visibleDeals: DealScore[];
  digest: MarketDigest | null;
  isSubscriber: boolean;
  lastUpdatedLine: string | null;
  selectedSetLabel: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset conversation when set filter changes
  useEffect(() => {
    setMessages([]);
  }, [selectedSetLabel]);

  const hasConversation = messages.length > 0;

  const pushPill = (pillId: PillId) => {
    setBusy(true);
    const label = PILLS.find((p) => p.id === pillId)?.label || pillId;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: label },
      { id: `a-${Date.now()}`, role: 'assistant', pillId },
    ]);
    window.setTimeout(() => setBusy(false), 400);
  };

  const onSubmitFreeText = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: t },
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        hint: 'I use live market data blocks — no free-form AI yet. Pick one of the suggestions below for a real answer from the feed.',
      },
    ]);
  };

  const ctx = { marketData, visibleDeals, digest, isSubscriber, selectedSetLabel, lastUpdatedLine };
  const visiblePills = PILLS.filter((p) => !p.subscriberOnly || isSubscriber);

  return (
    <div className={`flex flex-col h-full rounded-2xl bg-gray-950 overflow-hidden ${className ?? ''}`}>

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <div>
          <p className="text-sm font-bold text-white tracking-tight">Card Advisor</p>
          <p className="text-[11px] text-gray-500 mt-0.5">AI-powered market intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          {busy && (
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          )}
          <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 text-[11px] font-semibold rounded-full border border-blue-500/30">
            Live data
          </span>
        </div>
      </div>

      {/* ── Content area ── */}
      {!hasConversation ? (
        /* Empty state — centered call to action */
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">What would you like to know?</h2>
            <p className="text-sm text-gray-400">
              Ask about prices, trends, signals, or compare cards
            </p>
          </div>

          {/* Suggestion pills — 2 rows, centered */}
          <div className="flex flex-wrap gap-2 justify-center max-w-xl">
            {visiblePills.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pushPill(p.id)}
                className="px-4 py-2 rounded-full border border-gray-700 bg-gray-900 text-gray-300 text-sm hover:bg-gray-800 hover:text-white hover:border-gray-500 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Chat thread */
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4">
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gray-800 border border-gray-700 text-white text-sm px-4 py-2.5">
                    {msg.text}
                  </div>
                </div>
              );
            }
            if ('hint' in msg) {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-gray-800 bg-gray-900 text-sm text-gray-400 px-4 py-3 leading-relaxed">
                    {msg.hint}
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[90%] w-full space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500 px-1">Card Advisor</p>
                  {renderAssistantBody(msg.pillId, ctx)}
                </div>
              </div>
            );
          })}

          {/* Suggestions persist at end of thread */}
          <div className="pt-3">
            <p className="text-[10px] text-gray-600 mb-2 px-1">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {visiblePills.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pushPill(p.id)}
                  className="px-3 py-1.5 rounded-full border border-gray-800 bg-gray-900 text-gray-400 text-xs hover:bg-gray-800 hover:text-gray-200 hover:border-gray-700 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div ref={endRef} />
        </div>
      )}

      {/* ── Input bar ── */}
      <form onSubmit={onSubmitFreeText} className="px-4 py-4 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 focus-within:border-gray-500 transition">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any Pokémon card…"
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none"
          />
          <button
            type="submit"
            className="shrink-0 text-gray-500 hover:text-white transition p-0.5"
            aria-label="Send"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
