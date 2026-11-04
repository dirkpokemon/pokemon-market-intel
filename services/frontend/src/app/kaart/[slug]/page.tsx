/**
 * Public card page (for search engines and shared links): what a card costs in
 * Europe, from the analysis service's statistics. Server-rendered and cached
 * for an hour; summary numbers only (the daily history is a Plus feature).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import ToolShell from '@/components/ToolShell';
import CardmarketPrices from '@/components/CardmarketPrices';
import LanguageBadge from '@/components/LanguageBadge';
import SignalBadge, { signalExplanation } from '@/components/MarketSignal';
import { cardPath, cardSlug, parseCardSlug } from '@/lib/cardUrl';
import { eur } from '@/lib/format';
import { languageInfo } from '@/lib/languages';
import { SITE_URL } from '@/lib/site';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const revalidate = 3600;

interface CardRef {
  card_number: string;
  language: string;
  product_name: string;
  product_set?: string | null;
  collector_number?: string | null;
  rarity?: string | null;
  floor_price?: number | null;
  calculated_at?: string | null;
}

interface CardPageData {
  card: CardRef;
  typical_price?: number | null;
  current_price?: number | null;
  min_price_30d?: number | null;
  max_price_30d?: number | null;
  price_trend_30d?: number | null;
  days_observed: number;
  observations: number;
  market_signal?: string | null;
  floor_change_7d?: number | null;
  supply_change_7d?: number | null;
  other_languages: CardRef[];
  same_set: CardRef[];
  cardmarket?: { trend?: number | null; avg30?: number | null; low?: number | null; updated_at?: string | null } | null;
}

async function fetchCard(slug: string): Promise<CardPageData | null> {
  const key = parseCardSlug(slug);
  if (!key) return null;
  try {
    const qs = key.language !== 'EN' ? `?language=${key.language}` : '';
    const res = await fetch(`${API_URL}/api/v1/cards/${encodeURIComponent(key.card_number)}${qs}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as CardPageData;
  } catch {
    return null;
  }
}

function title(c: CardRef) {
  const number = c.collector_number ? ` #${c.collector_number}` : '';
  const lang = c.language !== 'EN' ? ` (${languageInfo(c.language)?.label ?? c.language})` : '';
  return `${c.product_name}${number}${lang}`;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await fetchCard(params.slug);
  if (!data) return { title: 'Kaart niet gevonden', robots: { index: false } };
  const c = data.card;
  const name = title(c);
  const set = c.product_set ? ` (${c.product_set})` : '';
  const description =
    `Wat kost ${name}${set} in Europa? Gebruikelijke laagste vraagprijs ${eur(c.floor_price)}` +
    (data.typical_price ? `, gemiddeld ${eur(data.typical_price)}` : '') +
    '. Prijzen van CardTrader, twee keer per dag bijgewerkt.';
  return {
    title: `${name}${set}: prijs in Europa`,
    description,
    alternates: { canonical: cardPath(c) },
    openGraph: { title: `${name}${set} | TCG Pulse`, description, url: cardPath(c) },
  };
}

export default async function CardPage({ params }: { params: { slug: string } }) {
  const data = await fetchCard(params.slug);
  if (!data) notFound();
  const c = data.card;
  // Old or hand-typed spelling: send people and crawlers to the current one
  if (params.slug !== cardSlug(c)) permanentRedirect(cardPath(c));

  const lang = languageInfo(c.language);
  const updated = c.calculated_at
    ? new Date(c.calculated_at).toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Amsterdam' })
    : null;
  const query = encodeURIComponent([c.product_name, c.collector_number, c.product_set].filter(Boolean).join(' '));
  const trend = data.price_trend_30d;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${title(c)}${c.product_set ? ` – ${c.product_set}` : ''}`,
    category: 'Pokémon-ruilkaart',
    url: `${SITE_URL}${cardPath(c)}`,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: data.current_price ?? c.floor_price,
      highPrice: data.max_price_30d ?? undefined,
      offerCount: data.observations || undefined,
    },
  };

  const stat = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4';
  const link = 'text-indigo-600 dark:text-indigo-400 hover:underline';

  return (
    <ToolShell>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

        <nav aria-label="Kruimelpad" className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <Link href="/" className="hover:underline">Home</Link> / <span>{c.product_set ?? 'Kaarten'}</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
          {c.product_name}
          {c.collector_number && <span className="text-gray-400 dark:text-gray-500 font-semibold"> #{c.collector_number}</span>}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-2">
          <span>{[c.product_set, c.rarity].filter(Boolean).join(' · ')}</span>
          <LanguageBadge language={c.language} />
          <SignalBadge signal={data.market_signal} floorChange={data.floor_change_7d} supplyChange={data.supply_change_7d} />
        </p>

        <section className="mt-8 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-5 sm:p-6">
          <p className="text-sm text-indigo-900 dark:text-indigo-100">
            Gebruikelijke laagste vraagprijs in Europa ({lang?.label ?? 'Engels'}, near-mint)
          </p>
          <p className="text-4xl font-bold text-indigo-950 dark:text-white mt-1">{eur(c.floor_price)}</p>
          {data.current_price != null && (
            <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-2">Goedkoopste aanbieding nu: {eur(data.current_price)}</p>
          )}
        </section>

        <section className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={stat}>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gemiddeld</p>
            <p className="text-lg font-semibold">{eur(data.typical_price)}</p>
          </div>
          <div className={stat}>
            <p className="text-xs text-gray-500 dark:text-gray-400">Laagste 30 dagen</p>
            <p className="text-lg font-semibold">{eur(data.min_price_30d)}</p>
          </div>
          <div className={stat}>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hoogste 30 dagen</p>
            <p className="text-lg font-semibold">{eur(data.max_price_30d)}</p>
          </div>
          <div className={stat}>
            <p className="text-xs text-gray-500 dark:text-gray-400">Trend 30 dagen</p>
            <p className="text-lg font-semibold">{trend == null ? '—' : `${trend > 0 ? '+' : ''}${Math.round(trend)}%`}</p>
          </div>
        </section>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Vraagprijzen van vergelijkbare aanbiedingen op CardTrader, {data.observations.toLocaleString('nl-NL')} prijzen over{' '}
          {data.days_observed} dagen{updated ? `, bijgewerkt ${updated}` : ''}.{' '}
          {data.market_signal ? signalExplanation(data.market_signal, data.floor_change_7d, data.supply_change_7d) : ''}
        </p>

        {data.cardmarket && (
          <section className="mt-6">
            <CardmarketPrices prices={data.cardmarket} />
          </section>
        )}

        <section className="mt-8 grid sm:grid-cols-3 gap-3">
          <Link href={`/prijscheck?q=${query}`} className={`${stat} hover:border-indigo-400 transition`}>
            <p className="font-semibold">Prijs checken</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Is een advertentie voor deze kaart eerlijk geprijsd?</p>
          </Link>
          <Link href="/register" className={`${stat} hover:border-indigo-400 transition`}>
            <p className="font-semibold">Prijsalert zetten</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Krijg een mail zodra hij onder je doelprijs komt.</p>
          </Link>
          <Link href={`/graden?q=${query}`} className={`${stat} hover:border-indigo-400 transition`}>
            <p className="font-semibold">Loont graden?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reken uit vanaf welke prijs een slab loont.</p>
          </Link>
        </section>

        {data.other_languages.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold mb-3">Andere talen</h2>
            <ul className="flex flex-wrap gap-2">
              {data.other_languages.map((o) => (
                <li key={o.language}>
                  <Link href={cardPath(o)} className={`${stat} inline-flex gap-2 py-2 px-3 text-sm hover:border-indigo-400`}>
                    <span>{languageInfo(o.language)?.flag} {languageInfo(o.language)?.label ?? o.language}</span>
                    <span className="text-gray-500 dark:text-gray-400">{eur(o.floor_price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.same_set.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold mb-3">Meer uit {c.product_set}</h2>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              {data.same_set.map((o) => (
                <li key={o.card_number}>
                  <Link href={cardPath(o)} className="flex justify-between gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <span className="min-w-0 truncate">
                      {o.product_name}
                      {o.collector_number && <span className="text-gray-400"> #{o.collector_number}</span>}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{eur(o.floor_price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-sm">
          <Link href="/prijscheck" className={link}>Een andere kaart zoeken →</Link>
        </p>
      </main>
    </ToolShell>
  );
}
