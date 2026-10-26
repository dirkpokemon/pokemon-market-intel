'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { DealScore, marketApi, notificationApi, PriceHistoryPoint, ConditionBreakdown } from '@/lib/api';
import CardImage from '@/components/CardImage';
import { UPSELL_SUBSCRIBE } from '@/lib/plans';

import SignalBadge, { signalExplanation } from '@/components/MarketSignal';
import LanguageBadge from '@/components/LanguageBadge';
import { eur } from '@/lib/format';
const CardHistoryChart = dynamic(() => import('@/components/CardHistoryChart'), { ssr: false });

// ─── Portfolio helpers ────────────────────────────────────────────────────────

const COLLECTION_KEY = 'portfolio_collection';

interface CollectionCard {
  id: string;
  name: string;
  set?: string;
  quantity: number;
  purchasePrice: number;
  condition: string;
  addedAt: string;
  notes?: string;
}

function addToPortfolio(card: CollectionCard) {
  try {
    const existing: CollectionCard[] = JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]');
    existing.push(card);
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(existing));
  } catch {}
}

// ─── Watchlist helpers ────────────────────────────────────────────────────────

function getWatchlist(): number[] {
  try { return JSON.parse(localStorage.getItem('watchlist') || '[]'); } catch { return []; }
}

function saveWatchlist(list: number[]) {
  localStorage.setItem('watchlist', JSON.stringify(list));
}

// ─── Insight logic ────────────────────────────────────────────────────────────

function buildInsight(deal: DealScore) {
  const discount = deal.market_avg_price && deal.market_avg_price > 0
    ? Math.round((1 - deal.current_price / deal.market_avg_price) * 100)
    : null;

  const pctText = discount !== null && discount > 0
    ? `${discount}% onder de normale vraagprijs`
    : discount !== null && discount < 0
    ? `${Math.abs(discount)}% boven de normale vraagprijs`
    : null;

  if (deal.deal_score >= 80) {
    return {
      verdict: 'Sterke deal',
      label: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
      border: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40',
      text: pctText
        ? `Aangeboden voor ${pctText}, met een dealscore van ${Math.round(deal.deal_score)}: een van de sterkere deals op dit moment.`
        : `Een dealscore van ${Math.round(deal.deal_score)} ligt ruim boven het gemiddelde. De prijsdata wijzen op een scherpe prijs.`,
    };
  }
  if (deal.deal_score >= 65) {
    return {
      verdict: 'Goede deal',
      label: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      border: 'border-blue-100 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40',
      text: pctText
        ? `Aangeboden voor ${pctText}. Een goede deal met een scherpe prijs ten opzichte van de Europese markt.`
        : `Een dealscore van ${Math.round(deal.deal_score)} wijst op een goede prijs.`,
    };
  }
  if (deal.deal_score >= 50) {
    return {
      verdict: 'Redelijke prijs',
      label: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
      border: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60',
      text: pctText
        ? `Aangeboden voor ${pctText}. Een score van ${Math.round(deal.deal_score)} is gemiddeld: geen uitschieter, wel een redelijke prijs.`
        : `Een score van ${Math.round(deal.deal_score)} is ongeveer gemiddeld. Redelijk geprijsd, niets bijzonders.`,
    };
  }
  return {
    verdict: 'Er zijn betere deals',
    label: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    border: 'border-amber-100 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
    text: pctText
      ? `De prijs ligt ${pctText}. Een score van ${Math.round(deal.deal_score)} betekent dat er waarschijnlijk betere deals zijn.`
      : `Een score van ${Math.round(deal.deal_score)} ligt onder het gemiddelde. Bekijk ook andere deals in deze set.`,
  };
}

function getPriceBar(deal: DealScore) {
  if (!deal.market_avg_price || deal.market_avg_price <= 0) return null;
  const low = Math.min(deal.current_price, deal.market_avg_price) * 0.85;
  const high = Math.max(deal.current_price, deal.market_avg_price) * 1.15;
  const pct = Math.max(2, Math.min(98, ((deal.current_price - low) / (high - low)) * 100));
  return { pct, low, high };
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// Strip everything CardMarket/CardTrader don't recognise in their search:
// parenthetical rarity tags, condition suffixes, extra descriptors
function cleanSearchName(name: string) {
  return name
    .replace(/\s*\([^)]*\)/g, '')                                          // (Special Illustration Rare), (Full Art), ...
    .replace(/\s*[-–]\s*(NM|LP|MP|HP|DMG|Near Mint|Lightly Played|Moderately Played|Heavily Played).*$/i, '')
    .replace(/\s+(Special Illustration Rare|Full Art|Alt Art|Alternate Art|Rainbow Rare|Secret Rare|Ultra Rare|Hyper Rare|Double Rare|Illustration Rare|Promo)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DealModalProps {
  deal: DealScore;
  onClose: () => void;
}

type HistoryDays = 7 | 30 | 90;

export default function DealModal({ deal, onClose }: DealModalProps) {
  const [inWatchlist, setInWatchlist] = useState(false);

  // Backend price alert (watchlist)
  const [alertOpen, setAlertOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState<string>(
    deal.current_price ? (deal.current_price * 0.9).toFixed(2) : ''
  );
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);
  const [alertError, setAlertError] = useState('');

  // Price history
  const [historyDays, setHistoryDays] = useState<HistoryDays>(30);
  const [historyData, setHistoryData] = useState<PriceHistoryPoint[]>([]);
  const [conditions, setConditions] = useState<ConditionBreakdown[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Price history is a Plus feature: the API answers 403 for Free accounts
  const [historyLocked, setHistoryLocked] = useState(false);

  // Portfolio add
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [portForm, setPortForm] = useState({
    quantity: 1,
    purchasePrice: deal.current_price,
    condition: 'NM',
    notes: '',
  });
  const [portfolioAdded, setPortfolioAdded] = useState(false);

  useEffect(() => {
    setInWatchlist(getWatchlist().includes(deal.id));
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deal.id, onClose]);

  // Load price history whenever panel opens or days change
  useEffect(() => {
    if (!historyOpen) return;
    setHistoryLoading(true);
    marketApi.getPriceHistory(deal.product_name, historyDays, deal)
      .then(r => { setHistoryData(r.history); setConditions(r.conditions); setHistoryLocked(false); })
      .catch((e: unknown) => {
        setHistoryData([]);
        setConditions([]);
        setHistoryLocked((e as { status?: number })?.status === 403);
      })
      .finally(() => setHistoryLoading(false));
  }, [historyOpen, historyDays, deal]);

  const toggleWatchlist = () => {
    const list = getWatchlist();
    const updated = inWatchlist ? list.filter(id => id !== deal.id) : [...list, deal.id];
    saveWatchlist(updated);
    setInWatchlist(!inWatchlist);
  };

  const handleAddAlert = async () => {
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) { setAlertError('Voer een geldige prijs in'); return; }
    setAlertSaving(true);
    setAlertError('');
    try {
      await notificationApi.addWatchlistItem({
        card_name: deal.product_name,
        card_set: deal.product_set ?? undefined,
        card_number: deal.card_number ?? undefined,
        language: deal.language ?? undefined,
        target_price: price,
      });
      setAlertSaved(true);
      setTimeout(() => { setAlertOpen(false); setAlertSaved(false); }, 1600);
    } catch (e: unknown) {
      setAlertError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setAlertSaving(false);
    }
  };

  const handleAddToPortfolio = () => {
    addToPortfolio({
      id: `deal-${deal.id}-${Date.now()}`,
      name: deal.product_name,
      set: deal.product_set,
      quantity: portForm.quantity,
      purchasePrice: portForm.purchasePrice,
      condition: portForm.condition,
      addedAt: new Date().toISOString(),
      notes: portForm.notes || undefined,
    });
    setPortfolioAdded(true);
    setTimeout(() => { setPortfolioOpen(false); setPortfolioAdded(false); }, 1500);
  };

  const { verdict, label, border, text } = buildInsight(deal);
  const bar = getPriceBar(deal);
  const savings = deal.market_avg_price && deal.market_avg_price > 0
    ? Math.round((1 - deal.current_price / deal.market_avg_price) * 100)
    : null;
  const scoreColor =
    deal.deal_score >= 80 ? 'text-green-700 dark:text-green-400' :
    deal.deal_score >= 65 ? 'text-blue-700 dark:text-blue-400' :
    deal.deal_score >= 50 ? 'text-gray-700 dark:text-gray-200' : 'text-amber-700 dark:text-amber-400';

  const searchName = cleanSearchName(deal.product_name);
  const cardMarketUrl = `https://www.cardmarket.com/en/Pokemon/Products/Singles?searchString=${encodeURIComponent(searchName)}&sortBy=price_asc&minCondition=2`;
  const cardTraderUrl = `https://www.cardtrader.com/en/games/pokemon/blueprints_search?q=${encodeURIComponent(searchName)}`;
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchName + ' Pokemon card')}&_sacat=183454&LH_BIN=1&_sop=15`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden border border-gray-200 dark:border-gray-800">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm transition text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          aria-label="Sluiten"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="overflow-y-auto max-h-[90vh]">

          {/* ── Identity + price ── */}
          <div className="flex gap-5 p-6 pb-0">
            <div className="flex-shrink-0">
              <CardImage cardName={deal.product_name} size="lg" className="!w-28 !h-40 shadow-md" />
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start gap-2 flex-wrap mb-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${label}`}>
                  {verdict}
                </span>
                {deal.product_set && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {deal.product_set}
                  </span>
                )}
                {(deal.collector_number || deal.rarity) && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {[deal.collector_number && `#${deal.collector_number}`, deal.rarity].filter(Boolean).join(' · ')}
                  </span>
                )}
                <LanguageBadge language={deal.language} className="!text-xs !px-2 !rounded-full" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3 pr-8">{deal.product_name}</h2>

              <div className="flex items-end gap-4 flex-wrap mb-3">
                <div>
                  <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Huidige prijs</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white leading-none">{eur(deal.current_price)}</p>
                </div>
                {deal.market_avg_price && deal.market_avg_price > 0 && (
                  <div className="pb-1">
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Normaal</p>
                    <p className="text-xl font-semibold text-gray-500 dark:text-gray-400">{eur(deal.market_avg_price)}</p>
                  </div>
                )}
                {savings !== null && savings !== 0 && (
                  <div className="pb-1">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${savings > 0 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                      {savings > 0 ? `${savings}% onder normaal` : `${Math.abs(savings)}% boven normaal`}
                    </span>
                  </div>
                )}
              </div>

              {bar && (
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Laag ca. {eur(bar.low)}</span>
                    <span>Hoog ca. {eur(bar.high)}</span>
                  </div>
                  <div className="relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="absolute h-2 rounded-full bg-gradient-to-r from-green-400 to-green-300" style={{ width: `${bar.pct}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white dark:bg-gray-900 border-2 border-gray-800 dark:border-gray-300 rounded-full shadow" style={{ left: `${bar.pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Positie van de prijs ten opzichte van de normale vraagprijs</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Insight ── */}
          <div className={`mx-6 mt-4 rounded-xl border p-4 ${border}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Wat dit betekent</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{text}</p>
          </div>

          {/* ── Buy/wait signal ── */}
          <div className="mx-6 mt-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Markttrend</p>
              <SignalBadge signal={deal.market_signal} floorChange={deal.floor_change_7d} supplyChange={deal.supply_change_7d} />
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {signalExplanation(deal.market_signal, deal.floor_change_7d, deal.supply_change_7d)}
            </p>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-3 gap-3 mx-6 mt-4">
            <div className="bg-gray-50 dark:bg-gray-800/80 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Dealscore</p>
              <p className={`text-2xl font-bold ${scoreColor}`}>{Math.round(deal.deal_score)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/80 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Betrouwbaarheid</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{deal.confidence != null ? `${deal.confidence}%` : 'n.v.t.'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/80 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Bijgewerkt</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight mt-1">{formatDate(deal.calculated_at)}</p>
            </div>
          </div>

          {/* ── Price history (collapsible) ── */}
          <div className="mx-6 mt-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setHistoryOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Prijsgeschiedenis</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Europese vraagprijzen per dag</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${historyOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {historyOpen && (
              <div className="p-4">
                {/* Day range tabs */}
                <div className="flex gap-1 mb-4">
                  {([7, 30, 90] as HistoryDays[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setHistoryDays(d)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${historyDays === d ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                      {d} dgn
                    </button>
                  ))}
                </div>

                <div style={{ height: 200 }}>
                  {historyLoading ? (
                    <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin mr-2" />
                      Laden…
                    </div>
                  ) : historyLocked ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                      <p className="text-sm text-gray-600 dark:text-gray-300">De volledige prijsgeschiedenis zit in Plus.</p>
                      <a
                        href="/pricing"
                        className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 transition font-medium"
                      >
                        {UPSELL_SUBSCRIBE}
                      </a>
                    </div>
                  ) : (
                    <CardHistoryChart history={historyData} />
                  )}
                </div>

                {/* Condition breakdown */}
                {conditions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      Huidig aanbod per conditie
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {conditions.map(c => (
                        <div key={c.condition} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{c.condition}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-600 dark:text-gray-300">{eur(c.avg_price)} gem.</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{c.count} aanbiedingen</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Buy links ── */}
          <div className="mx-6 mt-4">
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-2">Vind deze kaart</p>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={cardMarketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 px-3 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
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
                className="flex flex-col items-center justify-center gap-1 px-3 py-3 bg-gray-800 text-white text-sm font-semibold rounded-xl hover:bg-gray-900 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                CardTrader
              </a>
              <a
                href={ebayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 px-3 py-3 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                eBay
              </a>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              Opent een zoekopdracht op elk platform. Op eBay tonen we alleen “Nu kopen”, goedkoopste eerst.
            </p>
          </div>

          {/* ── Prijsalert (backend watchlist) ── */}
          {alertOpen && (
            <div className="mx-6 mt-4 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Prijsalert instellen</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Je ontvangt een e-mail zodra de goedkoopste aanbieding jouw doelprijs bereikt.
              </p>
              <div className="flex items-end gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Doelprijs (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={targetPrice}
                    onChange={e => { setTargetPrice(e.target.value); setAlertError(''); }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                {deal.current_price > 0 && (
                  <div className="text-right pb-2 shrink-0">
                    <p className="text-[10px] text-gray-400">Nu</p>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{eur(deal.current_price)}</p>
                  </div>
                )}
              </div>
              {alertError && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{alertError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAddAlert}
                  disabled={alertSaving || alertSaved}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-60"
                >
                  {alertSaved ? '✓ Alert opgeslagen!' : alertSaving ? 'Opslaan…' : 'Alert instellen'}
                </button>
                <button
                  onClick={() => setAlertOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                >
                  Annuleer
                </button>
              </div>
            </div>
          )}

          {/* ── Add to portfolio (collapsible form) ── */}
          {portfolioOpen && (
            <div className="mx-6 mt-4 border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/60">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Toevoegen aan portfolio</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Aantal</label>
                  <input
                    type="number"
                    min={1}
                    value={portForm.quantity}
                    onChange={e => setPortForm(f => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Aankoopprijs (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={portForm.purchasePrice}
                    onChange={e => setPortForm(f => ({ ...f, purchasePrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Conditie</label>
                <select
                  value={portForm.condition}
                  onChange={e => setPortForm(f => ({ ...f, condition: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent"
                >
                  {['NM', 'LP', 'MP', 'HP', 'DMG'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Notitie (optioneel)</label>
                <input
                  type="text"
                  placeholder="bijv. gekocht op een beurs in Utrecht"
                  value={portForm.notes}
                  onChange={e => setPortForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddToPortfolio}
                  disabled={portfolioAdded}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition disabled:bg-green-600"
                >
                  {portfolioAdded ? '✓ Toegevoegd!' : 'Toevoegen'}
                </button>
                <button
                  onClick={() => setPortfolioOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleWatchlist}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  inWatchlist
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800 dark:hover:bg-amber-950/60'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill={inWatchlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                {inWatchlist ? 'Watchlist' : '+ Watchlist'}
              </button>

              <button
                onClick={() => { setAlertOpen(v => !v); setPortfolioOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  alertOpen
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Prijsalert
              </button>

              <button
                onClick={() => { setPortfolioOpen(v => !v); setAlertOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  portfolioOpen
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                + Portfolio
              </button>
            </div>

            <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
              Sluiten
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
