'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { subscriptionApi } from '@/lib/api';

const plans = [
  {
    name: 'Free',
    price: '€0',
    period: '/month',
    description: 'Get started with the basics',
    features: [
      'Top 20 deal scores (≥65)',
      'Basic market statistics',
      'Portfolio tracking',
      'Card search (170K+ cards)',
      'Community support',
    ],
    cta: 'Current Plan',
    disabled: true,
    priceId: null,
  },
  {
    name: 'Paid',
    price: '€19',
    period: '/month',
    description: 'Full market intelligence access',
    features: [
      'All deal scores (no limits)',
      'Market Intelligence signals',
      'Set trends & supply monitoring',
      'Email & Telegram alerts',
      'Real-time data (no lag)',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PAID,
  },
  {
    name: 'Pro',
    price: '€49',
    period: '/month',
    description: 'For serious traders & shops',
    features: [
      'Everything in Paid',
      'API access',
      'Historical data export',
      'Custom alert rules',
      'White-label reports',
      'Dedicated support',
    ],
    cta: 'Go Pro',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubscribe = async (priceId: string | null | undefined, planName: string) => {
    if (!priceId) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setLoading(planName);
    setError('');

    try {
      const response = await subscriptionApi.createCheckoutSession(priceId);
      window.location.href = response.checkout_url;
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 z-50 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8 bg-white rounded-full border-[2.5px] border-gray-800 shadow-sm flex items-center justify-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500 rounded-t-full" />
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-800 -translate-y-1/2 z-10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-[1.5px] border-gray-800 z-20" />
            </div>
            <span className="text-sm font-bold text-gray-900">Pokemon Market Intel</span>
          </Link>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium">Login</Link>
            <Link href="/register" className="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-medium">Start Free</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, Transparent Pricing</h2>
          <p className="text-gray-500">Start free. Upgrade when you need full market intelligence.</p>
        </div>

        {error && (
          <div className="mb-8 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm max-w-2xl mx-auto">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-xl p-6 relative ${
                plan.highlighted
                  ? 'border-2 border-gray-900 shadow-lg'
                  : 'border border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gray-900 text-white text-[11px] font-bold rounded-full uppercase tracking-wide">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-bold text-gray-900 mb-0.5">{plan.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{plan.description}</p>
              <div className="mb-5">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-400 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.priceId, plan.name)}
                disabled={plan.disabled || loading === plan.name}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition ${
                  plan.highlighted
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {loading === plan.name ? 'Processing...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">30-day money-back guarantee. Cancel anytime. No questions asked.</p>
      </main>
    </div>
  );
}
