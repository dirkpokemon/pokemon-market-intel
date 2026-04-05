'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Poké Ball Logo ───────────────────────────────────────────────
function PokeBall({ size = 40 }: { size?: number }) {
  const border = size > 30 ? 3 : 2.5;
  const inner = size > 30 ? 3.5 : 3;
  return (
    <div
      className="relative bg-white rounded-full shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, borderWidth: border, borderColor: '#1f2937', borderStyle: 'solid' }}
    >
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500 rounded-t-full" />
      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-800 -translate-y-1/2 z-10" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full border-2 border-gray-800 z-20"
        style={{ width: inner * 2 + 4, height: inner * 2 + 4 }}
      >
        <div className="absolute inset-0.5 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

// ─── Mock Deal Card ───────────────────────────────────────────────
function MockDealCard({ name, set, price, avg, score, savings }: {
  name: string; set: string; price: string; avg: string; score: number; savings: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 w-[220px] flex-shrink-0 shadow-sm">
      {savings > 5 && (
        <div className="inline-block px-2 py-0.5 bg-green-600 text-white text-[11px] font-bold rounded-md mb-2">-{savings}%</div>
      )}
      <h4 className="text-sm font-semibold text-gray-900 mb-0.5 truncate">{name}</h4>
      <p className="text-[11px] text-gray-400 mb-2">{set}</p>
      <div className="flex items-end justify-between pt-2 border-t border-gray-100">
        <div>
          <p className="text-lg font-bold text-gray-900">{price}</p>
          <p className="text-[11px] text-gray-400 line-through">{avg} avg</p>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${score >= 80 ? 'bg-green-50' : 'bg-amber-50'}`}>
          <span className={`text-sm font-bold ${score >= 80 ? 'text-green-700' : 'text-amber-700'}`}>{score}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Mock Signal Row ──────────────────────────────────────────────
function MockSignalRow({ icon, label, color, description, time }: {
  icon: string; label: string; color: string; description: string; time: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${color}`}>{icon} {label}</span>
      <p className="text-xs text-gray-600 flex-1">{description}</p>
      <span className="text-[11px] text-gray-400 flex-shrink-0">{time}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* ═══ Header ═══ */}
      <header className="border-b border-gray-100 sticky top-0 z-50 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <PokeBall size={40} />
            <h1 className="text-lg font-bold text-gray-900">Pokemon Market Intel</h1>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium">
              Login
            </Link>
            <Link href="/register" className="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-medium">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* ═══ Hero ═══ */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-16 sm:px-6 lg:px-8 text-center">
        <div className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full mb-6 border border-green-200">
          EU-Focused &middot; 170K+ Listings &middot; Updated Every Hour
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight max-w-3xl mx-auto">
          Stop guessing.<br />
          Start buying <span className="text-green-600">below market price.</span>
        </h2>
        <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          AI-powered deal scoring, real-time market signals, and portfolio tracking for the European Pokemon TCG market. See what others miss.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/register')}
            className="bg-gray-900 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-gray-800 transition text-sm"
          >
            Start Free Trial
          </button>
          <button
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white text-gray-700 px-8 py-3.5 rounded-lg font-medium hover:bg-gray-50 transition border border-gray-200 text-sm"
          >
            See How It Works
          </button>
        </div>
      </section>

      {/* ═══ Feature Tour ═══ */}
      <div id="features" />

      {/* ─── Feature 1: Top Deals ─── */}
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-md uppercase tracking-wide mb-4">
              Top Deals
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Find cards below market price — instantly
            </h3>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Every listing gets an AI Deal Score (0-100) based on how far below market average it is, seller volume, market liquidity, and set popularity. Filter, sort, and buy with confidence.
            </p>
            <ul className="space-y-3">
              {[
                'Deal Score 0-100 for every card',
                'Green savings badge shows exact % below market',
                'Filter by price, score, set, or category',
                'Watchlist to save deals for later',
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Visual */}
          <div className="flex gap-3 justify-center overflow-hidden">
            <MockDealCard name="Charizard ex" set="Obsidian Flames" price="€42.50" avg="€55.00" score={92} savings={23} />
            <MockDealCard name="Pikachu VMAX" set="Vivid Voltage" price="€18.90" avg="€24.50" score={85} savings={23} />
            <div className="hidden xl:block">
              <MockDealCard name="Mew ex" set="151" price="€31.00" avg="€38.00" score={78} savings={18} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Feature 2: Market Intelligence ─── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual */}
            <div className="order-2 lg:order-1">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Live Signals</h4>
                <MockSignalRow icon="🚀" label="Momentum" color="text-green-700 bg-green-50 border-green-200" description="Charizard ex 151: price +18.5% and volume +32% in 7 days" time="2h ago" />
                <MockSignalRow icon="📉" label="Price Drop" color="text-orange-700 bg-orange-50 border-orange-200" description="Mewtwo VSTAR dropped -22% in 7 days (avg was €45.00)" time="4h ago" />
                <MockSignalRow icon="🔒" label="Supply Drop" color="text-purple-700 bg-purple-50 border-purple-200" description="Umbreon VMAX: -40% fewer listings — price may rise" time="5h ago" />
                <MockSignalRow icon="📈" label="Set Rising" color="text-emerald-700 bg-emerald-50 border-emerald-200" description="Paldean Fates is trending up: avg +12.3% across 48 cards" time="1h ago" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-600">📈</span>
                    <p className="text-xs font-semibold text-gray-900">Rising Sets</p>
                  </div>
                  <p className="text-[11px] text-gray-500">Paldean Fates +12.3%</p>
                  <p className="text-[11px] text-gray-500">151 +8.7%</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-600">📉</span>
                    <p className="text-xs font-semibold text-gray-900">Declining Sets</p>
                  </div>
                  <p className="text-[11px] text-gray-500">Paradox Rift -6.2%</p>
                  <p className="text-[11px] text-gray-500">Obsidian Flames -4.1%</p>
                </div>
              </div>
            </div>
            {/* Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-md uppercase tracking-wide mb-4">
                Market Intel
                <span className="px-1 py-0 bg-indigo-100 rounded text-[9px]">PRO</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                See what&apos;s changing — before prices move
              </h3>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Your market command center. Every hour we analyze 170K+ listings and detect momentum shifts, supply changes, volatility spikes, and set-level trends. No more scrolling through marketplaces.
              </p>
              <ul className="space-y-3">
                {[
                  'Momentum: price + volume both rising (buying opportunity)',
                  'Supply Drop: listings shrinking, price may rise soon',
                  'Set Trends: see which entire sets are rising or falling',
                  'Risk Alerts: possible bubbles or manipulation',
                  'Volatility: unstable prices, trade with caution',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* ─── Feature 3: Portfolio ─── */}
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-md uppercase tracking-wide mb-4">
              Portfolio
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Track your collection. Know your profit.
            </h3>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Add cards you own with purchase prices. We match them against live market data so you always know your total portfolio value, profit/loss per card, and ROI.
            </p>
            <ul className="space-y-3">
              {[
                'Live P&L: see exactly how much you\'re up or down',
                'Watchlist with price targets for cards you want to buy',
                'Triggered alerts when a card hits your target price',
                'Search 170K+ cards to add to your collection',
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Visual */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 border-b border-gray-100">
              <div className="p-4 text-center border-r border-gray-100">
                <p className="text-[11px] text-gray-500 mb-0.5">Portfolio Value</p>
                <p className="text-xl font-bold text-gray-900">&euro;1,247</p>
              </div>
              <div className="p-4 text-center border-r border-gray-100">
                <p className="text-[11px] text-gray-500 mb-0.5">Total P&L</p>
                <p className="text-xl font-bold text-green-700">+&euro;183</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[11px] text-gray-500 mb-0.5">ROI</p>
                <p className="text-xl font-bold text-green-700">+17.2%</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { name: 'Charizard ex', set: 'OBF', paid: '€35', current: '€48', pl: '+€13', pct: '+37%', up: true },
                { name: 'Pikachu VMAX', set: 'VIV', paid: '€22', current: '€19', pl: '-€3', pct: '-14%', up: false },
                { name: 'Mew ex', set: '151', paid: '€28', current: '€34', pl: '+€6', pct: '+21%', up: true },
              ].map(card => (
                <div key={card.name} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-[11px] font-bold text-gray-400">{card.set}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{card.name}</p>
                    <p className="text-[11px] text-gray-400">Paid {card.paid}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{card.current}</p>
                    <p className={`text-[11px] font-medium ${card.up ? 'text-green-600' : 'text-red-600'}`}>{card.pl} ({card.pct})</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Feature 4: Notifications ─── */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual */}
            <div className="order-2 lg:order-1 space-y-3">
              {[
                { channel: 'Email', icon: '📧', msg: 'Momentum Alert: Charizard ex 151 — price +18% and volume +32%. View on dashboard.' },
                { channel: 'Telegram', icon: '💬', msg: 'Supply Drop: Umbreon VMAX has 40% fewer listings. Price may rise.' },
                { channel: 'Email', icon: '📧', msg: 'Watchlist: Pikachu VMAX dropped below your target of €20.00 — now €18.90!' },
              ].map((n, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span>{n.icon}</span>
                    <span className="text-xs font-semibold text-white/70">{n.channel}</span>
                    <span className="text-[10px] text-white/40 ml-auto">just now</span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">{n.msg}</p>
                </div>
              ))}
            </div>
            {/* Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-block px-2.5 py-1 bg-white/10 text-white/80 text-[11px] font-semibold rounded-md uppercase tracking-wide mb-4">
                Notifications
              </div>
              <h3 className="text-3xl font-bold mb-4">
                Never miss a market move — even offline
              </h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                Choose exactly which signals matter to you. We send them to your email or Telegram bot — so you can act fast without checking the dashboard every hour.
              </p>
              <ul className="space-y-3">
                {[
                  'Email & Telegram delivery channels',
                  'Pick which signal types you care about',
                  'Set minimum priority (critical only, or everything)',
                  'Watchlist price target alerts included',
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
        <h3 className="text-2xl font-bold text-gray-900 mb-12">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'We scrape', desc: 'Every hour we collect 170K+ listings from EU marketplaces' },
            { step: '2', title: 'AI analyzes', desc: 'Deal scores, trend detection, and signal generation run automatically' },
            { step: '3', title: 'You act', desc: 'Browse Top Deals, check Market Intel, or get notified via email/Telegram' },
            { step: '4', title: 'You profit', desc: 'Buy below market, sell high. Track it all in your Portfolio' },
          ].map(s => (
            <div key={s.step}>
              <div className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-3">{s.step}</div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">{s.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Pricing (Inline) ═══ */}
      <section className="bg-gray-50 border-t border-gray-100" id="pricing">
        <div className="max-w-5xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">Simple Pricing</h3>
            <p className="text-gray-500">Start free. Upgrade when you&apos;re ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-1">Free</h4>
              <div className="mb-5">
                <span className="text-3xl font-bold text-gray-900">&euro;0</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {['Top 20 deals (score 65+)', 'Basic market stats', 'Portfolio tracking', 'Card search (170K+ cards)'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full text-center py-2.5 px-4 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
                Get Started
              </Link>
            </div>

            {/* Paid */}
            <div className="bg-white rounded-xl border-2 border-gray-900 p-6 relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gray-900 text-white text-[11px] font-bold rounded-full uppercase tracking-wide">
                Most Popular
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">Paid</h4>
              <div className="mb-5">
                <span className="text-3xl font-bold text-gray-900">&euro;19</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {[
                  'All deal scores (no limits)',
                  'Market Intelligence signals',
                  'Set trends & supply monitoring',
                  'Email & Telegram alerts',
                  'Real-time data (no lag)',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full text-center py-2.5 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition">
                Start Free Trial
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-1">Pro</h4>
              <div className="mb-5">
                <span className="text-3xl font-bold text-gray-900">&euro;49</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {[
                  'Everything in Paid',
                  'API access',
                  'Historical data export',
                  'Custom alert rules',
                  'Dedicated support',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full text-center py-2.5 px-4 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
                Go Pro
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">30-day money-back guarantee. Cancel anytime.</p>
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="max-w-4xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h3 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to buy smarter?
        </h3>
        <p className="text-lg text-gray-500 mb-8">
          Join traders across Europe who use Pokemon Market Intel to find undervalued cards, track market trends, and grow their collections.
        </p>
        <button
          onClick={() => router.push('/register')}
          className="bg-gray-900 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-gray-800 transition text-sm"
        >
          Get Started Free
        </button>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PokeBall size={24} />
            <span className="text-sm font-medium text-gray-500">Pokemon Market Intel EU</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
            <Link href="/login" className="hover:text-gray-600">Login</Link>
            <span>&copy; 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
