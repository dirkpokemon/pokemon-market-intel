'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscriptionApi } from '@/lib/api';

const plans = [
  {
    name: 'Free',
    price: '€0',
    period: '/month',
    features: [
      'Top 10 deal scores (≥70)',
      'Basic market statistics',
      'Community support',
      '24-hour data lag',
    ],
    cta: 'Current Plan',
    disabled: true,
    priceId: null,
  },
  {
    name: 'Paid',
    price: '€19',
    period: '/month',
    features: [
      'All deal scores',
      'Real-time signals',
      'Advanced analytics',
      'Email alerts',
      'Priority support',
      'Real-time data',
    ],
    cta: 'Upgrade Now',
    highlighted: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PAID,
  },
  {
    name: 'Pro',
    price: '€49',
    period: '/month',
    features: [
      'Everything in Paid',
      'API access',
      'Custom alerts',
      'Historical data',
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

    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setLoading(planName);
    setError('');

    try {
      const response = await subscriptionApi.createCheckoutSession(priceId);
      
      // Redirect to Stripe Checkout
      window.location.href = response.checkout_url;
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Pokemon Intel EU</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/login')}
              className="text-gray-600 hover:text-gray-900"
            >
              Login
            </button>
            <button
              onClick={() => router.push('/home')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-600">
            Unlock the full power of Pokemon market intelligence
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded max-w-2xl mx-auto">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                plan.highlighted ? 'ring-4 ring-blue-500 transform scale-105' : ''
              }`}
            >
              {plan.highlighted && (
                <div className="bg-blue-500 text-white text-center py-2 text-sm font-semibold">
                  MOST POPULAR
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.priceId, plan.name)}
                  disabled={plan.disabled || loading === plan.name}
                  className={`w-full py-3 px-6 rounded-md font-semibold transition ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.name ? 'Processing...' : plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-gray-600">
          <p>All plans include 30-day money-back guarantee</p>
          <p className="mt-2">Cancel anytime. No questions asked.</p>
        </div>
      </main>
    </div>
  );
}
