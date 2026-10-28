'use client';

/**
 * Public list price — "wat kost mijn lijst écht, inclusief verzending?" (roadmap #2,
 * docs/product/roadmap.md). Paste a want/deck list, get the cheapest combination of
 * CardTrader sellers and CardTrader Zero. Shipping is an ESTIMATE (CardTrader doesn't
 * publish per-seller rates), so the page always says "geschat".
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ToolShell from '@/components/ToolShell';
import { listPriceApi, ListPriceProduct, ListPriceResponse } from '@/lib/api';

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const fmt = (n: number | null | undefined) => (n == null ? '—' : eur.format(n));

const COUNTRIES: [string, string][] = [
  ['NL', 'Nederland'],
  ['BE', 'België'],
  ['DE', 'Duitsland'],
  ['FR', 'Frankrijk'],
  ['LU', 'Luxemburg'],
  ['AT', 'Oostenrijk'],
  ['IT', 'Italië'],
  ['ES', 'Spanje'],
  ['PT', 'Portugal'],
  ['IE', 'Ierland'],
  ['DK', 'Denemarken'],
  ['SE', 'Zweden'],
  ['FI', 'Finland'],
  ['PL', 'Polen'],
  ['CZ', 'Tsjechië'],
];

const EXAMPLE = `4 Charizard ex
2 Pikachu ex
1 Umbreon VMAX
3 Rare Candy`;

function productLabel(p: ListPriceProduct) {
  const variant = p.category === 'sealed' ? 'Sealed' : p.rarity;
  return [p.product_set, variant].filter(Boolean).join(' · ');
}

export default function ListPricePage() {
  const [text, setText] = useState('');
  const [country, setCountry] = useState('NL');
  const [condition, setCondition] = useState<'nm' | 'lp'>('nm');
  const [language, setLanguage] = useState<'EN' | 'JP'>('EN');
  const [loggedIn, setLoggedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ListPriceResponse | null>(null);

  useEffect(() => {
    try {
      setLoggedIn(Boolean(localStorage.getItem('access_token')));
    } catch {
      /* private mode */
    }
  }, []);

  const calculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await listPriceApi.calculate({ text, country, condition, language }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Berekenen is mislukt.');
    } finally {
      setBusy(false);
    }
  };

  const notFound = result?.lines.filter((l) => !l.matched) ?? [];
  const short = result?.lines.filter((l) => l.matched && l.missing > 0) ?? [];

  return (
    <ToolShell>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
          Gratis tot 10 kaarten · zonder account
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3">Wat kost je lijst écht?</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          Plak je wantlist of decklist. We zoeken de goedkoopste combinatie van verkopers op CardTrader — inclusief
          verzendkosten, want zeven kaarten bij zeven verkopers betekent zeven keer verzending.
        </p>

        <form
          onSubmit={calculate}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
        >
          <div>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <label htmlFor="lp-text" className="block text-sm font-semibold">
                Je lijst — één kaart per regel
              </label>
              <button
                type="button"
                onClick={() => setText(EXAMPLE)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Voorbeeld invullen
              </button>
            </div>
            <textarea
              id="lp-text"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'4 Charizard ex\n2x Pikachu ex\nRare Candy x3'}
              className="w-full px-3.5 py-3 text-base font-mono rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-y"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Een export uit Pokémon TCG Live of Limitless werkt ook. Voeg de setnaam toe als een kaart in meerdere sets
              bestaat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:items-end">
            <div>
              <label htmlFor="lp-country" className="block text-sm font-semibold mb-1.5">
                Bezorgen in
              </label>
              <select
                id="lp-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lp-condition" className="block text-sm font-semibold mb-1.5">
                Conditie
              </label>
              <select
                id="lp-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'nm' | 'lp')}
                className="w-full px-3 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="nm">Near mint</option>
                <option value="lp">Near mint of licht gespeeld</option>
              </select>
            </div>
            <div>
              <label htmlFor="lp-language" className="block text-sm font-semibold mb-1.5">
                Taal
              </label>
              <select
                id="lp-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'EN' | 'JP')}
                className="w-full px-3 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="EN">Engels</option>
                <option value="JP">Japans</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={!text.trim() || busy}
              className="px-6 py-3 min-h-[48px] rounded-xl bg-gray-900 dark:bg-indigo-600 text-white font-semibold hover:bg-gray-800 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {busy ? 'Rekenen…' : 'Bereken'}
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <div aria-live="polite">
          {result && (
            <section className="mt-8 space-y-4">
              <div className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-50 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
                  Goedkoopste combinatie · {result.shipments.length}{' '}
                  {result.shipments.length === 1 ? 'zending' : 'zendingen'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">{fmt(result.total)} totaal</h2>
                <p className="leading-relaxed">
                  {fmt(result.cards_total)} aan kaarten + {fmt(result.shipping_total)} geschatte verzending.
                  {result.savings > 0.5 && (
                    <>
                      {' '}
                      Dat is <strong>{fmt(result.savings)} goedkoper</strong> dan elke kaart los bij de goedkoopste verkoper
                      kopen ({fmt(result.naive_total)}).
                    </>
                  )}
                </p>
              </div>

              {(notFound.length > 0 || short.length > 0 || result.truncated > 0) && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50 p-4 text-sm space-y-1.5">
                  {notFound.length > 0 && (
                    <p>
                      Niet gevonden: <strong>{notFound.map((l) => l.query).join(', ')}</strong>. Controleer de spelling of
                      voeg de setnaam toe. We volgen nu vooral Engelstalige sets van de laatste jaren.
                    </p>
                  )}
                  {short.map((l) => (
                    <p key={l.query}>
                      {l.query}: nu maar {l.found} van de {l.quantity} exemplaren te koop in deze conditie.
                    </p>
                  ))}
                  {result.truncated > 0 && (
                    <p>
                      Alleen de eerste {result.line_limit} kaarten zijn berekend ({result.truncated} overgeslagen).{' '}
                      {loggedIn ? (
                        <Link href="/pricing" className="font-semibold underline">
                          Met Plus reken je lijsten tot 60 kaarten door.
                        </Link>
                      ) : (
                        <Link href="/register" className="font-semibold underline">
                          Met een Plus-account reken je lijsten tot 60 kaarten door.
                        </Link>
                      )}
                    </p>
                  )}
                </div>
              )}

              {result.shipments.map((sh) => (
                <div
                  key={sh.label}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <h3 className="font-semibold">
                      {sh.label}
                      {sh.kind === 'zero' && (
                        <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                          één zending vanuit CardTrader
                        </span>
                      )}
                    </h3>
                    <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {fmt(sh.subtotal)} + {fmt(sh.shipping)} verzending
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sh.items.map((it) => (
                      <li key={`${it.line}-${it.price}`} className="py-2 flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                          <span className="font-medium">
                            {it.copies}× {it.product_name}
                          </span>
                          {it.product_set && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{it.product_set}</span>
                          )}
                        </span>
                        <span className="flex items-baseline gap-3 shrink-0">
                          <span className="text-sm">
                            {fmt(it.price)}
                            {it.copies > 1 && <span className="text-gray-500 dark:text-gray-400"> p.st.</span>}
                          </span>
                          {it.url && (
                            <a
                              href={it.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Op CardTrader
                            </a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold mb-2">Herkende kaarten</h3>
                <ul className="text-sm space-y-1.5">
                  {result.lines
                    .filter((l) => l.matched)
                    .map((l) => (
                      <li key={l.query} className="flex flex-wrap gap-x-2">
                        <span className="font-medium">
                          {l.quantity}× {l.matched!.product_name}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">{productLabel(l.matched!)}</span>
                        {l.alternatives.length > 0 && (
                          <span className="text-gray-500 dark:text-gray-400">
                            — niet deze? Voeg de set toe, bijv. “{l.alternatives[0].product_name}{' '}
                            {l.alternatives[0].product_set}”
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {result.shipping_note} Verkopers tonen we zonder naam; open de kaart op CardTrader en kies een verkoper uit
                het genoemde land rond deze prijs. Prijzen zijn vraagprijzen
                {result.listings_as_of &&
                  ` van ${new Date(result.listings_as_of).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}`}
                ; het aanbod verandert snel.
              </p>
            </section>
          )}
        </div>
      </main>
    </ToolShell>
  );
}
