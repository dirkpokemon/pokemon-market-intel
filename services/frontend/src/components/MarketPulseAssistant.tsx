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

type ChatRole = 'user' | 'assistant';

type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; pillId: PillId }
  | { id: string; role: 'assistant'; hint: string };

const PILLS: { id: PillId; label: string; subscriberOnly?: boolean }[] = [
  { id: 'snapshot', label: 'Snel overzicht' },
  { id: 'priceVsAvg', label: 'Prijs vs gemiddelde' },
  { id: 'topSets', label: 'Top sets' },
  { id: 'trends7d', label: 'Sets ↑↓ 7d' },
  { id: 'scoreMix', label: 'Score-mix' },
  { id: 'priceSpread', label: 'Prijs-spreiding' },
  { id: 'priceBuckets', label: 'Prijsbuckets', subscriberOnly: true },
];

function PulseAvatar({ busy }: { busy?: boolean }) {
  return (
    <div className="relative w-11 h-11 shrink-0">
      <div
        className={`absolute inset-0 rounded-full border-2 border-indigo-400/40 ${busy ? 'animate-ping' : 'opacity-0'}`}
        aria-hidden
      />
      <div className="relative rounded-full bg-white shadow-md border border-gray-200 p-0.5">
        <svg viewBox="0 0 40 40" className="w-9 h-9" aria-hidden>
          <circle cx="20" cy="20" r="18" fill="#fafafa" />
          <path d="M20 2c9.94 0 18 8.06 18 18H2c0-9.94 8.06-18 18-18z" fill="#dc2626" />
          <rect x="2" y="19" width="36" height="2" fill="#111827" />
          <circle cx="20" cy="20" r="7" fill="#fff" stroke="#111827" strokeWidth="2" />
          <circle cx="20" cy="20" r="3" fill="#111827" />
        </svg>
      </div>
    </div>
  );
}

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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden text-left">
      <div className="px-3 py-2 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100">
        <p className="text-xs font-semibold text-indigo-900">{title}</p>
      </div>
      <div className="p-3 text-sm text-gray-700">{children}</div>
      {footer ? <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-500">{footer}</div> : null}
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
  const scopeNote = selectedSetLabel ? `Filter: set “${selectedSetLabel}”.` : 'Alle sets in deze data-slice.';
  const sourceFooter = (
    <span>
      Bron: gescoorde deals in deze weergave
      {lastUpdatedLine ? ` · ${lastUpdatedLine}` : ''}
    </span>
  );

  switch (pillId) {
    case 'snapshot':
      return (
        <AssistantCard title="Snel overzicht" footer={sourceFooter}>
          <p className="text-xs text-gray-600 mb-3">{scopeNote}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{marketData.totalProducts}</p>
              <p className="text-[10px] text-gray-500">Listings</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">€{marketData.avgPrice.toFixed(2)}</p>
              <p className="text-[10px] text-gray-500">Gem. prijs</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{marketData.avgScore}</p>
              <p className="text-[10px] text-gray-500">Gem. score</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">
                {digest?.total_sets != null ? digest.total_sets.toLocaleString() : 'n.v.t.'}
              </p>
              <p className="text-[10px] text-gray-500">Sets (catalogus)</p>
            </div>
          </div>
        </AssistantCard>
      );
    case 'priceVsAvg':
      return (
        <AssistantCard title="Onder / boven marktgemiddelde" footer={sourceFooter}>
          <p className="text-xs text-gray-600 mb-2">
            Sterste kortingen (listing onder eigen marktgemiddelde) in deze slice. Tik voor Deals.
          </p>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {marketData.buying.slice(0, 6).map((d) => (
              <li key={d.id}>
                <Link
                  href={`/deals?card=${encodeURIComponent(d.product_name)}`}
                  className="flex justify-between gap-2 text-xs hover:text-indigo-700"
                >
                  <span className="truncate font-medium text-gray-900">{d.product_name}</span>
                  <span className="text-green-700 shrink-0 font-semibold">{d.delta.toFixed(1)}%</span>
                </Link>
              </li>
            ))}
          </ul>
          {marketData.buying.length === 0 && (
            <p className="text-xs text-gray-400">Geen rijen met marktgemiddelde voor deze selectie.</p>
          )}
        </AssistantCard>
      );
    case 'topSets':
      return (
        <AssistantCard title="Top sets in deze weergave" footer={sourceFooter}>
          <ul className="space-y-1.5">
            {marketData.topSets.slice(0, 6).map((s, i) => (
              <li key={s.name} className="flex justify-between gap-2 text-xs">
                <span className="text-gray-400 w-4">{i + 1}</span>
                {s.name !== 'Unknown' ? (
                  <Link href={`/deals?set=${encodeURIComponent(s.name)}`} className="flex-1 truncate font-medium text-indigo-700 hover:underline">
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
          <AssistantCard title="Set-trends (7d)" footer={sourceFooter}>
            <p className="text-xs text-gray-500">Nog geen trenddata beschikbaar.</p>
          </AssistantCard>
        );
      }
      return (
        <AssistantCard title="Set-trends (7d gemiddelde)" footer={sourceFooter}>
          <p className="text-xs text-gray-600 mb-2">Uit market stats (breder dan alleen de deal-toplijst).</p>
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <p className="font-semibold text-green-800 mb-1">Stijgend</p>
              <ul className="space-y-1">
                {(digest.top_rising_sets || []).slice(0, 4).map((t) => (
                  <li key={t.product_set} className="flex justify-between gap-2">
                    <Link href={`/deals?set=${encodeURIComponent(t.product_set)}`} className="truncate text-indigo-700 hover:underline">
                      {t.product_set}
                    </Link>
                    <span className="text-green-700 font-medium shrink-0">+{t.avg_trend}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-rose-800 mb-1">Dalend</p>
              <ul className="space-y-1">
                {(digest.top_declining_sets || []).slice(0, 4).map((t) => (
                  <li key={t.product_set} className="flex justify-between gap-2">
                    <Link href={`/deals?set=${encodeURIComponent(t.product_set)}`} className="truncate text-indigo-700 hover:underline">
                      {t.product_set}
                    </Link>
                    <span className="text-rose-700 font-medium shrink-0">{t.avg_trend}%</span>
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
          <AssistantCard title="Score-mix" footer={sourceFooter}>
            <p className="text-xs text-gray-600 mb-3">Volledige verdeling over alle score-buckets zit op Plus.</p>
            <Link href="/pricing" className="inline-flex text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800">
              Plus
            </Link>
          </AssistantCard>
        );
      }
      return (
        <AssistantCard title="Score-mix (deze weergave)" footer={sourceFooter}>
          <div className="space-y-2">
            {[
              { label: '80+', count: marketData.scoreDistribution.excellent, color: 'bg-green-500' },
              { label: '65 tot 79', count: marketData.scoreDistribution.good, color: 'bg-blue-500' },
              { label: '50 tot 64', count: marketData.scoreDistribution.fair, color: 'bg-gray-400' },
              { label: '<50', count: marketData.scoreDistribution.low, color: 'bg-gray-300' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span>{row.label}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{
                      width: `${Math.max(4, (row.count / Math.max(1, marketData.totalProducts)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AssistantCard>
      );
    case 'priceSpread':
      return (
        <AssistantCard title="Prijs-spreiding" footer={sourceFooter}>
          <p className="text-xs text-gray-600 mb-2">Verdeling van listingprijzen in deze slice.</p>
          <div className="h-[200px] w-full">
            <PriceChart deals={visibleDeals.slice(0, isSubscriber ? 100 : 20)} />
          </div>
        </AssistantCard>
      );
    case 'priceBuckets':
      if (!isSubscriber) {
        return (
          <AssistantCard title="Prijsbuckets" footer={sourceFooter}>
            <p className="text-xs text-gray-600 mb-3">Beschikbaar op Plus.</p>
            <Link href="/pricing" className="inline-flex text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800">
              Plus
            </Link>
          </AssistantCard>
        );
      }
      return (
        <AssistantCard title="Prijsbuckets" footer={sourceFooter}>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            {[
              { label: '< €5', n: marketData.ranges.under5 },
              { label: '€5 tot €20', n: marketData.ranges.range5to20 },
              { label: '€20 tot €50', n: marketData.ranges.range20to50 },
              { label: '> €50', n: marketData.ranges.over50 },
            ].map((b) => (
              <div key={b.label} className="rounded-lg bg-gray-50 py-2">
                <p className="text-base font-bold text-gray-900">{b.n}</p>
                <p className="text-[10px] text-gray-500">{b.label}</p>
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

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        pillId: 'snapshot',
      },
    ]);
  }, [selectedSetLabel]);

  const pushPill = (pillId: PillId) => {
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: PILLS.find((p) => p.id === pillId)?.label || pillId },
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
        hint:
          'Ik gebruik nog vaste data-blokken (geen vrije AI). Kies een suggestie hierboven voor prijzen, sets of trends. Dan krijg je antwoord uit de live feed.',
      },
    ]);
  };

  const ctx = { marketData, visibleDeals, digest, isSubscriber, selectedSetLabel, lastUpdatedLine };

  const visiblePills = PILLS.filter((p) => !p.subscriberOnly || isSubscriber);

  return (
    <div
      className={`flex flex-col h-full min-h-[420px] rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-b from-white to-indigo-50/40 dark:from-gray-900 dark:to-indigo-950/30 shadow-sm overflow-hidden ${className ?? ''}`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-indigo-100 bg-white/80">
        <PulseAvatar busy={busy} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">Pulse</p>
          <p className="text-[11px] text-gray-500 leading-snug">Antwoorden uit live marktdata</p>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-gray-100 bg-white/60">
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Suggesties</p>
        <div className="flex flex-wrap gap-1.5">
          {visiblePills.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pushPill(p.id)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-900 text-white text-xs px-3 py-2">{msg.text}</div>
              </div>
            );
          }
          if ('hint' in msg) {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 text-xs text-gray-600 px-3 py-2 leading-relaxed">
                  {msg.hint}
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[95%] w-full space-y-1">
                <p className="text-[10px] font-semibold text-indigo-700">Pulse</p>
                {renderAssistantBody(msg.pillId, ctx)}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmitFreeText} className="p-3 border-t border-gray-200 bg-white/90">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Korte vraag (experimenteel)…"
            className="flex-1 min-w-0 text-xs px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
          <button
            type="submit"
            className="shrink-0 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
          >
            Stuur
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Voor antwoorden uit de feed: gebruik de pillen. Vrij typen geeft alleen een korte hint (nog geen AI).
        </p>
      </form>
    </div>
  );
}
