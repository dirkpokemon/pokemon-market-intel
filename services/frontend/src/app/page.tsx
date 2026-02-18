'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 z-50 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Poké Ball Logo */}
            <div className="relative w-10 h-10 bg-white rounded-full border-[3px] border-gray-800 shadow-sm flex items-center justify-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500 rounded-t-full" />
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-800 transform -translate-y-1/2 z-10" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-gray-800 z-20">
                <div className="absolute inset-0.5 bg-gray-100 rounded-full" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Pokémon Market Intel</h1>
          </div>
          <div className="flex gap-3 items-center">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Pokémon Card Market
          <br />
          Intelligence, <span className="text-gray-400">Simplified</span>
        </h2>
        <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Real-time price tracking, deal analysis, and market signals for the European Pokémon TCG market. Never miss a great deal again.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/register')}
            className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition text-sm"
          >
            Start Free Trial
          </button>
          <button
            onClick={() => router.push('/pricing')}
            className="bg-white text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition border border-gray-200 text-sm"
          >
            View Pricing
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Market Analytics</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Track 7-day and 30-day price trends, volume, and liquidity scores for every card.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
            <div className="text-3xl mb-4">💎</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Deal Scores</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              AI-powered deal scoring (0-100) based on price deviation, volume trends, and market liquidity.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
            <div className="text-3xl mb-4">🔔</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Real-time Signals</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Instant alerts for undervalued cards, momentum plays, arbitrage opportunities, and risk warnings.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold mb-10">Trusted by Pokémon TCG Traders Across Europe</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold mb-1">10k+</div>
              <div className="text-gray-400 text-sm">Products Tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-1">500+</div>
              <div className="text-gray-400 text-sm">Daily Signals</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-1">24/7</div>
              <div className="text-gray-400 text-sm">Market Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h3 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to find your next great deal?
        </h3>
        <p className="text-lg text-gray-500 mb-8">
          Join traders using Pokémon Market Intel EU to stay ahead of the market
        </p>
        <button
          onClick={() => router.push('/register')}
          className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition text-sm"
        >
          Get Started Free
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">&copy; 2026 Pokémon Market Intel EU. All rights reserved.</p>
          <p className="mt-1 text-xs text-gray-300">
            EU-focused Pokémon TCG market intelligence platform
          </p>
        </div>
      </footer>
    </div>
  );
}
