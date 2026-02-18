'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-bold text-gray-900">Pokemon Intel EU</h1>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 px-4 py-2"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          Pokemon Card Market Intelligence
          <br />
          <span className="text-blue-600">Made Simple</span>
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Real-time price tracking, deal analysis, and market signals for the European Pokemon TCG market.
          Never miss a great deal again.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/register')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
          >
            Start Free Trial
          </button>
          <button
            onClick={() => router.push('/pricing')}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition shadow"
          >
            View Pricing
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Market Analytics</h3>
            <p className="text-gray-600">
              Track 7-day and 30-day price trends, volume, and liquidity scores for every card.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">💎</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Deal Scores</h3>
            <p className="text-gray-600">
              AI-powered deal scoring (0-100) based on price deviation, volume trends, and market liquidity.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">🔔</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Real-time Signals</h3>
            <p className="text-gray-600">
              Instant alerts for undervalued cards, momentum plays, arbitrage opportunities, and risk warnings.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-8">Trusted by Pokemon TCG Traders Across Europe</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">10k+</div>
              <div className="text-blue-100">Products Tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Daily Signals</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">Market Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h3 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to find your next great deal?
        </h3>
        <p className="text-xl text-gray-600 mb-8">
          Join hundreds of traders using Pokemon Intel EU to maximize their profits
        </p>
        <button
          onClick={() => router.push('/register')}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg text-lg"
        >
          Get Started Free
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2026 Pokemon Intel EU. All rights reserved.</p>
          <p className="mt-2 text-sm">
            EU-focused Pokemon TCG market intelligence platform
          </p>
        </div>
      </footer>
    </div>
  );
}
