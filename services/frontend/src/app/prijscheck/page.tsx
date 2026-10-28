'use client';

/**
 * Public price check — "is dit een eerlijke prijs?" (roadmap #1, docs/product/roadmap.md).
 * No login: paste a listing or type a card, pick the exact variant, see the verdict.
 * Wording rule: these are ASKING prices and we never call a listing fraud —
 * only "unusually low, be careful".
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ToolShell from '@/components/ToolShell';
import SignalBadge, { signalExplanation } from '@/components/MarketSignal';
import {
  notificationApi,
  priceCheckApi,
  PriceCheckMatch,
  PriceCheckResponse,
  PriceVerdictCode,
} from '@/lib/api';

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const fmt = (n: number | null | undefined) => (n == null ? '—' : eur.format(n));

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const VERDICTS: Record<PriceVerdictCode, { title: string; tone: string; text: (r: PriceCheckResponse) => string }> = {
  suspicious_low: {
    title: 'Ongebruikelijk laag — wees voorzichtig',
    tone: 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100',
    text: (r) =>
      `Deze prijs ligt ${Math.round(-r.verdict.pct_vs_floor)}% onder de gebruikelijke laagste vraagprijs in Europa. ` +
      'Zulke prijzen zijn een bekend signaal bij oplichting: vervalste kaarten, of betalen en niets ontvangen. ' +
      "Betaal alleen via een platform met kopersbescherming en vraag om extra foto's.",
  },
  below_floor: {
    title: 'Scherpe prijs',
    tone: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
    text: (r) =>
      `${Math.round(-r.verdict.pct_vs_floor)}% onder de gebruikelijke laagste vraagprijs. ` +
      'Een goede deal — als de kaart echt is en in de beschreven staat.',
  },
  normal: {
    title: 'Normale prijs',
    tone: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100',
    text: () => 'Deze prijs past bij wat vergelijkbare aanbiedingen in Europa normaal kosten.',
  },
  high: {
    title: 'Aan de hoge kant',
    tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
    text: (r) =>
      `${Math.round(r.verdict.pct_vs_typical)}% boven de normale prijs. Vergelijkbare exemplaren zijn vaak goedkoper te vinden.`,
  },
  very_high: {
    title: 'Duur',
    tone: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100',
    text: (r) =>
      `${Math.round(r.verdict.pct_vs_typical)}% boven de normale prijs. Check of je de juiste variant hebt gekozen; anders is dit te veel.`,
  },
};

function variantLabel(m: { collector_number?: string | null; rarity?: string | null; category: string; language?: string | null }) {
  const lang = m.language === 'JP' ? ' · Japans' : '';
  if (m.category === 'sealed') return 'Sealed product' + lang;
  return ([m.collector_number && `#${m.collector_number}`, m.rarity].filter(Boolean).join(' · ') || 'Single') + lang;
}

export default function PriceCheckPage() {
  const [query, setQuery] = useState('');
  const [priceText, setPriceText] = useState('');
  const [matches, setMatches] = useState<PriceCheckMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<PriceCheckMatch | null>(null);
  const [result, setResult] = useState<PriceCheckResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [alertState, setAlertState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const priceTouched = useRef(false);

  useEffect(() => {
    try {
      setLoggedIn(Boolean(localStorage.getItem('access_token')));
    } catch {
      /* private mode */
    }
  }, []);

  // Debounced search while typing / after pasting a listing
  useEffect(() => {
    const q = query.trim();
    setSelected(null);
    setResult(null);
    if (q.length < 2) {
      setMatches([]);
      setSearched(false);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const res = await priceCheckApi.search(q);
        setMatches(res.results);
        setSearched(true);
        if (res.detected_price && !priceTouched.current) {
          setPriceText(String(res.detected_price).replace('.', ','));
        }
        if (res.results.length === 1) setSelected(res.results[0]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Zoeken mislukt.');
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const price = parsePrice(priceText);

  const runCheck = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selected || !price) return;
    setChecking(true);
    setError('');
    setAlertState('idle');
    try {
      setResult(await priceCheckApi.check(selected, price));
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'De prijscheck is mislukt.');
    } finally {
      setChecking(false);
    }
  };

  const addAlert = async () => {
    if (!result) return;
    setAlertState('saving');
    try {
      await notificationApi.addWatchlistItem({
        card_name: result.product_name,
        card_set: result.product_set ?? undefined,
        card_number: result.card_number ?? undefined,
        language: result.language ?? undefined,
        target_price: result.price,
      });
      setAlertState('saved');
    } catch {
      setAlertState('error');
    }
  };

  const verdict = result ? VERDICTS[result.verdict.code] : null;

  return (
    <ToolShell>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
          Gratis prijscheck · zonder account
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3">Is dit een eerlijke prijs?</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          Plak een advertentie van Marktplaats, Vinted of Facebook, of typ een kaartnaam. Je ziet direct wat vergelijkbare
          aanbiedingen in Europa kosten — en of een deal te mooi is om waar te zijn.
        </p>

        <form
          onSubmit={runCheck}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
        >
          <div>
            <label htmlFor="pc-query" className="block text-sm font-semibold mb-1.5">
              Advertentie of kaartnaam
            </label>
            <textarea
              id="pc-query"
              rows={2}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bijv. “Charizard ex 199/165 — € 45” of “151 booster bundle”"
              className="w-full px-3.5 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-y"
            />
          </div>

          {(searching || searched) && (
            <fieldset>
              <legend className="text-sm font-semibold mb-2">
                {searching ? 'Zoeken…' : matches.length ? 'Kies de juiste kaart' : 'Geen kaart gevonden'}
              </legend>
              {!searching && searched && matches.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Probeer de naam van de kaart of de set, zonder extra woorden. We volgen nu vooral Engelstalige sets van de
                  laatste jaren.
                </p>
              )}
              <div className="grid gap-2">
                {matches.map((m) => {
                  const key = `${m.product_name}|${m.product_set}|${m.card_number ?? ''}|${m.category}|${m.language ?? 'EN'}`;
                  const active =
                    selected &&
                    `${selected.product_name}|${selected.product_set}|${selected.card_number ?? ''}|${selected.category}|${selected.language ?? 'EN'}` === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelected(m);
                        setResult(null);
                      }}
                      aria-pressed={Boolean(active)}
                      className={`text-left px-4 py-3 rounded-xl border transition min-h-[44px] ${
                        active
                          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{m.product_name}</span>
                        {m.floor_price != null && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">vanaf ~{fmt(m.floor_price)}</span>
                        )}
                      </span>
                      <span className="block text-sm text-gray-600 dark:text-gray-400">
                        {m.product_set ?? 'Onbekende set'} · {variantLabel(m)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label htmlFor="pc-price" className="block text-sm font-semibold mb-1.5">
                Gevraagde prijs
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">
                  €
                </span>
                <input
                  id="pc-price"
                  inputMode="decimal"
                  value={priceText}
                  onChange={(e) => {
                    priceTouched.current = true;
                    setPriceText(e.target.value);
                  }}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3.5 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!selected || !price || checking}
              className="px-6 py-3 min-h-[48px] rounded-xl bg-gray-900 dark:bg-indigo-600 text-white font-semibold hover:bg-gray-800 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {checking ? 'Bezig…' : 'Check prijs'}
            </button>
          </div>
          {!selected && matches.length > 1 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Kies eerst welke kaart (en variant) het is.</p>
          )}
        </form>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <div aria-live="polite">
          {result && verdict && (
            <section className="mt-8 space-y-4">
              <div className={`rounded-2xl border-2 p-5 sm:p-6 ${verdict.tone}`}>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
                  {result.product_name} · {result.product_set ?? ''} · {variantLabel(result)}
                </p>
                <h2 className="text-2xl font-bold mb-2">
                  {fmt(result.price)} — {verdict.title}
                </h2>
                <p className="leading-relaxed">{verdict.text(result)}</p>
                {result.verdict.low_data && (
                  <p className="mt-3 text-sm font-medium">
                    Let op: voor deze kaart hebben we nog weinig data ({result.reference.days_observed} dagen). Zie dit als een
                    ruwe indicatie.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Gebruikelijke laagste vraagprijs</p>
                  <p className="text-xl font-bold mt-1">{fmt(result.reference.floor_price)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Normale prijs</p>
                  <p className="text-xl font-bold mt-1">{fmt(result.reference.typical_price)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Goedkoopste aanbieding nu</p>
                  <p className="text-xl font-bold mt-1">{fmt(result.reference.current_price)}</p>
                </div>
              </div>

              {result.graded && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h3 className="font-semibold mb-1">Gegradeerde exemplaren</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Nu te koop vanaf <strong>{fmt(result.graded.min_price)}</strong> ({result.graded.listings}{' '}
                    {result.graded.listings === 1 ? 'aanbieding' : 'aanbiedingen'}). CardTrader vermeldt niet welk cijfer
                    of welk bedrijf (PSA, BGS, CGC), dus vergelijk een gegradeerde kaart altijd per cijfer.
                  </p>
                </div>
              )}

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">Kopen of wachten?</h3>
                  <SignalBadge
                    signal={result.reference.market_signal}
                    floorChange={result.reference.floor_change_7d}
                    supplyChange={result.reference.supply_change_7d}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {signalExplanation(
                    result.reference.market_signal,
                    result.reference.floor_change_7d,
                    result.reference.supply_change_7d,
                  )}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold mb-1">Verkoop je deze kaart?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Opkopers bieden meestal 70–90% van wat een kaart realistisch opbrengt. Een eerlijk bod ligt rond{' '}
                  <strong>
                    {fmt(result.verdict.fair_offer_low)} – {fmt(result.verdict.fair_offer_high)}
                  </strong>
                  . Zelf verkopen levert waarschijnlijk rond {fmt(result.reference.floor_price)} op.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Wil je een mail zodra deze kaart voor {fmt(result.price)} of minder te koop staat?
                </p>
                {loggedIn ? (
                  <button
                    type="button"
                    onClick={addAlert}
                    disabled={alertState === 'saving' || alertState === 'saved'}
                    className="px-4 py-2.5 min-h-[44px] rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60 transition whitespace-nowrap"
                  >
                    {alertState === 'saved'
                      ? 'Prijsalert staat aan'
                      : alertState === 'saving'
                        ? 'Opslaan…'
                        : alertState === 'error'
                          ? 'Opnieuw proberen'
                          : 'Zet prijsalert'}
                  </button>
                ) : (
                  <Link
                    href="/register"
                    className="px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition whitespace-nowrap"
                  >
                    Gratis account maken
                  </Link>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {result.basis}
                {result.category === 'single' && ' Andere condities of talen zijn meestal goedkoper.'} Gebaseerd op{' '}
                {result.reference.observations.toLocaleString('nl-NL')} prijzen over {result.reference.days_observed} dagen
                {result.reference.calculated_at &&
                  `, bijgewerkt ${new Date(result.reference.calculated_at).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}`}
                . Dit is een indicatie, geen garantie en geen oordeel over een verkoper.
              </p>
            </section>
          )}
        </div>
      </main>
    </ToolShell>
  );
}
