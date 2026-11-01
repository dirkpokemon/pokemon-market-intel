'use client';

/**
 * "Loont graden?" (roadmap #4): pick a card, see its raw price and what graded
 * copies cost on CardTrader now, and work out from which graded sale price
 * grading pays off. All costs are editable; the math is in lib/grading.ts.
 */

import { useEffect, useMemo, useState } from 'react';
import ToolShell from '@/components/ToolShell';
import LanguageBadge from '@/components/LanguageBadge';
import { gradingApi, priceCheckApi, GradingData, PriceCheckMatch } from '@/lib/api';
import { eur, parseEuro } from '@/lib/format';
import { breakEvenPrice, costPerCard, expectedGain } from '@/lib/grading';

const CUSTOM = 'custom';

const input =
  'w-full px-3 py-2.5 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500';
const label = 'block text-sm font-semibold mb-1.5';
const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm';

const num = (s: string) => parseEuro(s) ?? 0;
const toInput = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const pct = (s: string) => Math.min(100, Math.max(0, Number(s.replace(',', '.')) || 0)) / 100;

function gradeLabel(company: string | null, grade: number | null) {
  if (!company) return 'Cijfer onbekend';
  return `${company} ${grade != null ? String(grade).replace('.', ',') : ''}`.trim();
}

function matchKey(m: PriceCheckMatch) {
  return `${m.product_name}|${m.product_set}|${m.card_number ?? ''}|${m.language ?? 'EN'}`;
}

export default function GradingPage() {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<PriceCheckMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<PriceCheckMatch | null>(null);
  const [data, setData] = useState<GradingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculator inputs (text, so "49,99" can be typed naturally)
  const [service, setService] = useState('psa_frankfurt');
  const [fee, setFee] = useState('');
  const [shipping, setShipping] = useState('');
  const [cards, setCards] = useState('1');
  const [sellingFee, setSellingFee] = useState('5');
  const [rawValue, setRawValue] = useState('');
  const [price10, setPrice10] = useState('');
  const [price9, setPrice9] = useState('');
  const [chance10, setChance10] = useState('25');
  const [chance9, setChance9] = useState('50');

  // Card search (singles only; graded slabs are single cards)
  useEffect(() => {
    const q = query.trim();
    setSelected(null);
    setData(null);
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
        const singles = res.results.filter((m) => m.category === 'single' && m.card_number);
        setMatches(singles);
        setSearched(true);
        if (singles.length === 1) setSelected(singles[0]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Zoeken mislukt.');
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  // Load the card's data and fill the calculator with its numbers
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    gradingApi
      .get(selected)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setRawValue(toInput(d.raw.floor_price));
        setSellingFee(String(d.selling_fee_pct));
        const preset = d.services.find((s) => s.id === service) ?? d.services[0];
        if (preset) {
          setService(preset.id);
          setFee(toInput(preset.fee));
          setShipping(toInput(preset.shipping));
        }
        const psa = (g: number) => d.graded.find((o) => o.company === 'PSA' && o.grade === g)?.min_price;
        setPrice10(psa(10) != null ? toInput(psa(10)!) : '');
        setPrice9(psa(9) != null ? toInput(psa(9)!) : '');
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e.message : 'Ophalen mislukt.');
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // service is read once to pick the preset; changing it later is handled by chooseService
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const chooseService = (id: string) => {
    setService(id);
    const preset = data?.services.find((s) => s.id === id);
    if (preset) {
      setFee(toInput(preset.fee));
      setShipping(toInput(preset.shipping));
    }
  };

  const costs = { fee: num(fee), shipping: num(shipping), cardsInShipment: Number(cards) || 1, sellingFeePct: Number(sellingFee.replace(',', '.')) || 0 };
  const raw = num(rawValue);
  const perCard = costPerCard(costs);
  const breakEven = raw > 0 ? breakEvenPrice(raw, costs) : null;
  const p10 = parseEuro(price10);
  const p9 = parseEuro(price9);
  const gain = useMemo(
    () =>
      raw > 0 && p10 != null
        ? expectedGain(raw, costs, { chance10: pct(chance10), price10: p10, chance9: pct(chance9), price9: p9 ?? raw })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, p10, p9, chance10, chance9, fee, shipping, cards, sellingFee],
  );
  const preset = data?.services.find((s) => s.id === service);

  return (
    <ToolShell>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
          Rekenhulp · gratis
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3">Loont graden?</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          Kies je kaart. We zetten de prijs van de ongegradeerde kaart tegenover wat graden vanuit Europa kost, en rekenen
          uit vanaf welke verkoopprijs een gegradeerde kaart meer oplevert.
        </p>

        <section className={`${card} space-y-4`}>
          <div>
            <label htmlFor="gr-query" className={label}>
              Kaart
            </label>
            <input
              id="gr-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bijv. “Charizard ex 199 Obsidian Flames”"
              className={input}
              autoComplete="off"
            />
          </div>
          {(searching || searched) && (
            <fieldset>
              <legend className="text-sm font-semibold mb-2">
                {searching ? 'Zoeken…' : matches.length ? 'Kies de juiste kaart' : 'Geen kaart gevonden'}
              </legend>
              <div className="grid gap-2">
                {matches.map((m) => {
                  const active = selected && matchKey(selected) === matchKey(m);
                  return (
                    <button
                      key={matchKey(m)}
                      type="button"
                      onClick={() => setSelected(m)}
                      aria-pressed={Boolean(active)}
                      className={`text-left px-4 py-3 rounded-xl border transition min-h-[44px] ${
                        active
                          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">
                          {m.product_name} <LanguageBadge language={m.language} />
                        </span>
                        {m.floor_price != null && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">vanaf ~{eur(m.floor_price)}</span>
                        )}
                      </span>
                      <span className="block text-sm text-gray-600 dark:text-gray-400">
                        {m.product_set ?? 'Onbekende set'}
                        {m.collector_number && ` · #${m.collector_number}`}
                        {m.rarity && ` · ${m.rarity}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </section>

        {error && (
          <p role="alert" className="mt-6 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-sm text-red-800 dark:text-red-200">
            {error}
          </p>
        )}
        {loading && <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Prijzen ophalen…</p>}

        {data && !loading && (
          <>
            <section className={`${card} mt-6`}>
              <h2 className="text-lg font-bold mb-1">Wat staat er nu te koop?</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Ongegradeerd (near-mint) is de gebruikelijke laagste vraagprijs <strong>{eur(data.raw.floor_price)}</strong>,
                gemiddeld {eur(data.raw.typical_price)} (CardTrader, laatste 30 dagen).
              </p>
              {data.graded.length > 0 ? (
                <>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                    {data.graded.map((o) => (
                      <li key={`${o.company}-${o.grade}`} className="py-2 flex justify-between gap-3">
                        <span>{gradeLabel(o.company, o.grade)}</span>
                        <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          vanaf {eur(o.min_price)} · {o.listings}×
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    Gegradeerde exemplaren op CardTrader nu; het cijfer halen we uit de beschrijving van de verkoper. Het zijn
                    vraagprijzen, geen verkoopprijzen.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Op CardTrader staat deze kaart nu niet gegradeerd te koop. Kijk op Cardmarket of eBay wat een PSA 10 of 9
                  ongeveer opbrengt en vul dat hieronder in.
                </p>
              )}
            </section>

            <section className={`${card} mt-6 space-y-5`}>
              <h2 className="text-lg font-bold">Kosten van graden</h2>
              <div>
                <label htmlFor="gr-service" className={label}>
                  Gradeerbedrijf
                </label>
                <select id="gr-service" value={service} onChange={(e) => chooseService(e.target.value)} className={input}>
                  {data.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                  <option value={CUSTOM}>Eigen bedragen</option>
                </select>
                {preset && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{preset.note}</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="gr-fee" label="Gradeerkosten per kaart" value={fee} onChange={(v) => { setFee(v); setService(CUSTOM); }} euro />
                <Field id="gr-ship" label="Verzending heen en terug (per zending)" value={shipping} onChange={(v) => { setShipping(v); setService(CUSTOM); }} euro />
                <Field id="gr-cards" label="Kaarten in de zending" value={cards} onChange={setCards} />
                <Field id="gr-sell" label="Verkoopkosten marktplaats (%)" value={sellingFee} onChange={setSellingFee} />
              </div>
              <Field id="gr-raw" label="Waarde ongegradeerd (wat je er nu voor krijgt)" value={rawValue} onChange={setRawValue} euro />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bedragen zijn indicatief (gecontroleerd in {data.presets_checked}); verzending is onze schatting. Controleer de
                actuele prijzen bij het gradeerbedrijf.
              </p>
            </section>

            {breakEven != null && (
              <section className="mt-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-5 sm:p-6">
                <p className="text-sm text-indigo-900 dark:text-indigo-100">Graden kost je {eur(perCard)} per kaart. Het loont pas als je de gegradeerde kaart verkoopt voor meer dan</p>
                <p className="text-3xl font-bold text-indigo-950 dark:text-white mt-1">{eur(breakEven)}</p>
                <p className="text-xs text-indigo-800 dark:text-indigo-200 mt-2">
                  Daaronder verdien je meer door de kaart ongegradeerd te verkopen (inclusief {sellingFee || 0}% verkoopkosten).
                </p>
              </section>
            )}

            <section className={`${card} mt-6 space-y-5`}>
              <div>
                <h2 className="text-lg font-bold">Wat levert het gemiddeld op?</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Niet elke kaart wordt een 10. Vul in wat een PSA 10 en 9 opbrengen en hoe groot je de kans schat. Een lager
                  cijfer rekenen we als ongeveer de ongegradeerde waarde.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="gr-p10" label="Verkoopprijs PSA 10" value={price10} onChange={setPrice10} euro placeholder="Bijv. 150" />
                <Field id="gr-c10" label="Kans op een 10 (%)" value={chance10} onChange={setChance10} />
                <Field id="gr-p9" label="Verkoopprijs PSA 9" value={price9} onChange={setPrice9} euro placeholder="Bijv. 70" />
                <Field id="gr-c9" label="Kans op een 9 (%)" value={chance9} onChange={setChance9} />
              </div>
              {gain != null ? (
                <p
                  className={`p-4 rounded-xl text-sm font-medium ${
                    gain >= 0
                      ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                      : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                  }`}
                >
                  {gain >= 0
                    ? `Gemiddeld ${eur(gain)} meer dan ongegradeerd verkopen.`
                    : `Gemiddeld ${eur(-gain)} minder dan ongegradeerd verkopen: graden lijkt hier niet te lonen.`}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Vul de verkoopprijs van een PSA 10 in om dit te berekenen.</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Een rekenvoorbeeld, geen advies. De kans op een 10 hangt af van centrering, hoeken en oppervlak van jouw
                exemplaar.
              </p>
            </section>
          </>
        )}
      </main>
    </ToolShell>
  );
}

function Field({
  id,
  label: text,
  value,
  onChange,
  euro = false,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  euro?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <div className="relative">
        {euro && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">€</span>}
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${input} ${euro ? 'pl-8' : ''}`}
        />
      </div>
    </div>
  );
}
