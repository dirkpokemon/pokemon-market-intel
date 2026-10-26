'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import BusinessWaitlistActions from '@/components/BusinessWaitlistActions';
import BrandMark from '@/components/BrandMark';
import { ThemeIconButton } from '@/components/ThemeToggle';
import { CTA_SUBSCRIBE_PLUS, PLAN_FEATURES } from '@/lib/plans';
import { publicApi, DealScore } from '@/lib/api';
import { eur } from '@/lib/format';

// ─── Live Deal Card ───────────────────────────────────────────────
function LiveDealCard({ deal }: { deal: DealScore }) {
  const savings = deal.market_avg_price && deal.market_avg_price > deal.current_price
    ? Math.round((1 - deal.current_price / deal.market_avg_price) * 100)
    : 0;
  const score = deal.deal_score;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 w-[210px] flex-shrink-0 shadow-sm">
      {savings > 5 && (
        <div className="inline-block px-2 py-0.5 bg-emerald-500 text-white text-[11px] font-bold rounded-md mb-2">
          -{savings}%
        </div>
      )}
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5 truncate" title={deal.product_name}>
        {deal.product_name}
      </h4>
      <p className="text-[11px] text-gray-400 mb-2 truncate">{deal.product_set ?? '—'}</p>
      <div className="flex items-end justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{eur(deal.current_price)}</p>
          {deal.market_avg_price && savings > 0 && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 line-through">{eur(deal.market_avg_price)} normaal</p>
          )}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${score >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-amber-50 dark:bg-amber-950/50'}`}>
          <span className={`text-sm font-bold ${score >= 80 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {Math.round(score)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Deal Card (loading state) ──────────────────────────
function SkeletonDealCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 w-[210px] flex-shrink-0 animate-pulse">
      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1" />
      <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded mb-3" />
      <div className="flex items-end justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [liveDeals, setLiveDeals] = useState<DealScore[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  useEffect(() => {
    publicApi.getTopDeals()
      .then(setLiveDeals)
      .finally(() => setDealsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">TCG Pulse</h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-tight max-w-[200px] sm:max-w-none hidden sm:block">
                Eerlijke Pokémon-prijzen in Europa
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 items-center">
            <ThemeIconButton />
            <Link href="/prijscheck" className="hidden sm:inline-flex text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 sm:px-4 py-2 text-sm font-medium rounded-lg">
              Prijscheck
            </Link>
            <Link href="/lijstprijs" className="hidden md:inline-flex text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 sm:px-4 py-2 text-sm font-medium rounded-lg">
              Lijstprijs
            </Link>
            <Link href="/login" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 sm:px-4 py-2 text-sm font-medium rounded-lg">
              Inloggen
            </Link>
            <Link
              href="/register"
              className="bg-gray-900 dark:bg-indigo-600 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-500 transition text-sm font-medium"
            >
              Gratis beginnen
            </Link>
          </div>
        </div>
      </header>

      {/* ═══ Hero ═══ */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-16 sm:px-6 lg:px-8 text-center">
        <div className="inline-block px-3 py-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full mb-6 border border-green-200 dark:border-green-800">
          Europees aanbod &middot; Euro-prijzen &middot; Twee keer per dag bijgewerkt
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight max-w-3xl mx-auto">
          Weet wat een Pokémon-kaart<br />
          <span className="text-green-600 dark:text-green-400">écht kost.</span>
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          De eerlijke prijscheck voor Europa. Inclusief verzending, zonder Amerikaanse prijzen, en met een waarschuwing als een deal te mooi is om waar te zijn.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/prijscheck"
            className="bg-indigo-600 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-indigo-500 transition text-sm"
          >
            Check een prijs — gratis, zonder account
          </Link>
          <button
            onClick={() => router.push('/register')}
            className="bg-gray-900 dark:bg-indigo-600 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-indigo-500 transition text-sm"
          >
            Gratis account
          </button>
          <button
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-8 py-3.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition border border-gray-200 dark:border-gray-700 text-sm"
          >
            Zo werkt het
          </button>
        </div>
      </section>

      {/* ═══ Live Deals Ticker ═══ */}
      <div className="border-y border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Actuele deals</span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none flex-1">
              {dealsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 animate-pulse">
                    <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="w-12 h-3 bg-gray-100 dark:bg-gray-600 rounded" />
                  </div>
                ))
              ) : liveDeals.length > 0 ? (
                liveDeals.map(deal => {
                  const savings = deal.market_avg_price && deal.market_avg_price > deal.current_price
                    ? Math.round((1 - deal.current_price / deal.market_avg_price) * 100)
                    : 0;
                  return (
                    <Link
                      key={deal.id}
                      href="/register"
                      className="flex-shrink-0 flex items-center gap-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 transition group"
                    >
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 max-w-[140px] truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {deal.product_name}
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{eur(deal.current_price)}</span>
                      {savings > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">-{savings}%</span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${deal.deal_score >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                        {Math.round(deal.deal_score)}
                      </span>
                    </Link>
                  );
                })
              ) : null}
              <Link
                href="/register"
                className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition px-2"
              >
                Alle deals →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Feature Tour ═══ */}
      <div id="features" />

      {/* ─── Feature 1: Top Deals ─── */}
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-semibold rounded-md uppercase tracking-wide mb-4">
              Topdeals
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Vind kaarten onder de normale prijs
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Elke kaart krijgt een dealscore van 0 tot 100: hoe ver de goedkoopste aanbieding onder de gebruikelijke laagste prijs zit, hoeveel aanbod er is en hoe gewild de set is. Filter, sorteer en koop met vertrouwen.
            </p>
            <ul className="space-y-3">
              {[
                'Dealscore van 0–100 voor elke kaart',
                'Groen label toont precies hoeveel % onder normaal',
                'Filter op prijs, score, set of categorie',
                'Bewaar deals in je watchlist',
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-500 transition"
              >
                Bekijk actuele deals
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
          {/* Live deal cards */}
          <div className="flex gap-3 justify-center overflow-hidden">
            {dealsLoading ? (
              <>
                <SkeletonDealCard />
                <SkeletonDealCard />
                <div className="hidden xl:block"><SkeletonDealCard /></div>
              </>
            ) : liveDeals.length >= 2 ? (
              <>
                <LiveDealCard deal={liveDeals[0]} />
                <LiveDealCard deal={liveDeals[1]} />
                {liveDeals[2] && (
                  <div className="hidden xl:block">
                    <LiveDealCard deal={liveDeals[2]} />
                  </div>
                )}
              </>
            ) : (
              // Fallback als er geen data is
              <div className="flex items-center justify-center w-full h-40 text-sm text-gray-400 dark:text-gray-600">
                Laden…
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Feature 2: Watchlist price alerts ─── */}
      <section className="bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual */}
            <div className="order-2 lg:order-1">
              <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Jouw watchlist</h4>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {[
                    { name: 'Charizard ex', set: 'Obsidian Flames', target: '€40', current: '€38,50', hit: true },
                    { name: 'Umbreon VMAX', set: 'Evolving Skies', target: '€55', current: '€61,00', hit: false },
                    { name: 'Mew ex', set: '151', target: '€30', current: '€34,20', hit: false },
                  ].map(row => (
                    <div key={row.name} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{row.name}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">{row.set} · doel {row.target}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{row.current}</p>
                        {row.hit ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">🔔 doelprijs bereikt</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">volgen</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-block px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold rounded-md uppercase tracking-wide mb-4">
                Watchlist
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Stel een doelprijs in. Krijg een seintje als hij zakt.
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Voeg een kaart toe met de prijs die jij ervoor wilt betalen. We checken het Europese aanbod twee keer per dag en mailen je zodra je doelprijs bereikt is — zelf elke dag kijken is niet nodig.
              </p>
              <ul className="space-y-3">
                {[
                  'Een doelprijs per kaart, zoveel kaarten als je wilt',
                  'Twee keer per dag vergeleken met het Europese aanbod',
                  'Een e-mail zodra je doelprijs bereikt is',
                  'Bekijk ondertussen alle sets en sealed prijzen',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Feature 3: Notifications ─── */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual */}
            <div className="order-2 lg:order-1 space-y-3">
              {[
                { channel: 'E-mail', icon: '📧', msg: 'Watchlist: Charizard ex (Obsidian Flames) zakte onder je doelprijs van €40,00. Nu €38,50.' },
                { channel: 'E-mail', icon: '📧', msg: 'Watchlist: Pikachu VMAX bereikte je doelprijs van €20,00. Nu €18,90.' },
                { channel: 'E-mail', icon: '📧', msg: 'Dagelijkse samenvatting: 8 nieuwe deals met een score van 80+.' },
              ].map((n, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span>{n.icon}</span>
                    <span className="text-xs font-semibold text-white/70">{n.channel}</span>
                    <span className="text-[10px] text-white/40 ml-auto">zojuist</span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">{n.msg}</p>
                </div>
              ))}
            </div>
            {/* Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-block px-2.5 py-1 bg-white/10 text-white/80 text-[11px] font-semibold rounded-md uppercase tracking-wide mb-4">
                Meldingen
              </div>
              <h3 className="text-3xl font-bold mb-4">
                Mis nooit een prijsdaling
              </h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                We mailen je watchlist-alerts, zodat je snel kunt handelen zonder het dashboard in de gaten te houden. Wil je meer? Zet de dagelijkse samenvatting met de beste nieuwe deals aan.
              </p>
              <ul className="space-y-3">
                {[
                  'In elke mail met één klik afmelden',
                  'Alerts voor je doelprijzen',
                  'Optioneel: dagelijkse samenvatting van topdeals',
                  'Alles aan of uit te zetten in je instellingen',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/80">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-12">Zo werkt het</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Wij verzamelen', desc: 'Twee keer per dag halen we het actuele aanbod op van CardTrader, een Europese marktplaats' },
            { step: '2', title: 'Wij vergelijken', desc: 'Elke kaart krijgt een dealscore ten opzichte van wat hij in Europa normaal kost' },
            { step: '3', title: 'Jij kiest', desc: 'Bekijk de topdeals, check een prijs of stel een doelprijs in' },
            { step: '4', title: 'Jij bespaart', desc: 'Koop voor een eerlijke prijs, met een seintje in je inbox zodra je doelprijs bereikt is' },
          ].map(s => (
            <div key={s.step}>
              <div className="w-10 h-10 bg-gray-900 dark:bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-3 ring-2 ring-gray-900/10 dark:ring-indigo-500/30">{s.step}</div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{s.title}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Pricing (Inline) ═══ */}
      <section className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800" id="pricing">
        <div className="max-w-5xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Eenvoudige prijzen</h3>
            <p className="text-gray-500 dark:text-gray-400">Begin gratis. Upgrade wanneer je wilt.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Gratis</h4>
              <div className="mb-5">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">&euro;0</span>
                <span className="text-gray-400 dark:text-gray-500 text-sm">/maand</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {PLAN_FEATURES.free.slice(0, 5).map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full text-center py-2.5 px-4 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Gratis beginnen
              </Link>
            </div>

            {/* Plus */}
            <div className="bg-white dark:bg-gray-950 rounded-xl border-2 border-gray-900 dark:border-indigo-500 p-6 relative shadow-lg dark:shadow-indigo-950/40">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gray-900 dark:bg-indigo-500 text-white text-[11px] font-bold rounded-full uppercase tracking-wide">
                Meest gekozen
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Plus</h4>
              <div className="mb-5">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">&euro;19</span>
                <span className="text-gray-400 dark:text-gray-500 text-sm">/maand</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {PLAN_FEATURES.paid.slice(0, 5).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <svg className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="block w-full text-center py-2.5 px-4 rounded-lg bg-gray-900 dark:bg-indigo-600 text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-indigo-500 transition">
                {CTA_SUBSCRIBE_PLUS}
              </Link>
            </div>

            {/* Business waitlist, no checkout yet */}
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 relative">
              <div className="absolute top-4 right-4 px-2 py-0.5 bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-200 text-[10px] font-bold rounded-full uppercase">
                Wachtlijst
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Business</h4>
              <div className="mb-5">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Binnenkort</span>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Betaald zodra API en export klaar zijn</p>
              </div>
              <ul className="space-y-2.5 mb-6">
                {PLAN_FEATURES.pro.slice(0, 5).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <BusinessWaitlistActions variant="card" />
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">30 dagen geld-terug-garantie. Altijd opzegbaar.</p>
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="max-w-4xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Klaar om slimmer te kopen?
        </h3>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
          Check prijzen, bereken je lijst inclusief verzending en krijg een seintje als je kaart betaalbaar wordt.
        </p>
        <button
          onClick={() => router.push('/register')}
          className="bg-gray-900 dark:bg-indigo-600 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-indigo-500 transition text-sm"
        >
          Gratis beginnen
        </button>
      </section>

      <SiteFooter showMarketingLinks />
    </div>
  );
}
