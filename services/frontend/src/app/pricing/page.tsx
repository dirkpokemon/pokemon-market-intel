'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { subscriptionApi } from '@/lib/api';
import SiteFooter from '@/components/SiteFooter';
import BusinessWaitlistActions from '@/components/BusinessWaitlistActions';
import BrandMark from '@/components/BrandMark';
import { ThemeIconButton } from '@/components/ThemeToggle';
import { CTA_SUBSCRIBE_PLUS, PLAN_FEATURES, PLUS_PRICE } from '@/lib/plans';

type PlanKey = 'free' | 'paid' | 'pro';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [error, setError] = useState('');
  const [canceledNotice, setCanceledNotice] = useState(false);
  const [accountRole, setAccountRole] = useState<string | null>(null);
  const [stripePrices, setStripePrices] = useState<{
    paid?: string;
  }>(() => ({
    paid: process.env.NEXT_PUBLIC_STRIPE_PRICE_PAID || undefined,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setAccountRole(JSON.parse(raw).role ?? 'free');
      } catch {
        setAccountRole(null);
      }
    } else {
      setAccountRole(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('canceled') === '1') {
      setCanceledNotice(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await subscriptionApi.getPlanPrices();
        if (cancelled) return;
        setStripePrices({
          paid: p.stripe_price_paid?.trim() || undefined,
        });
      } catch {
        /* keep build-time env fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const plans = useMemo(
    () =>
      [
        {
          key: 'free' as const,
          name: 'Gratis',
          price: '€0',
          period: '/maand',
          description: 'Begin met de basis',
          features: [...PLAN_FEATURES.free],
          highlighted: false,
          priceId: null as string | null,
        },
        {
          key: 'paid' as const,
          name: 'Plus',
          price: PLUS_PRICE,
          period: '/maand',
          description: 'Alle deals, prijsgeschiedenis en alerts',
          features: [...PLAN_FEATURES.paid],
          highlighted: true,
          priceId: stripePrices.paid || null,
        },
        {
          key: 'pro' as const,
          name: 'Business',
          price: 'Binnenkort',
          period: '',
          description: 'API, export en uitgebreide regels. Zet je op de wachtlijst.',
          features: [...PLAN_FEATURES.pro],
          highlighted: false,
          priceId: null as string | null,
        },
      ] as const,
    [stripePrices.paid]
  );

  const resolveButton = (planKey: PlanKey) => {
    const r = (accountRole || 'free').toLowerCase();
    if (r === 'admin') {
      if (planKey === 'free') return { disabled: true as const, label: '…', mode: 'idle' as const };
      return { disabled: true as const, label: 'Admintoegang', mode: 'idle' as const };
    }
    if (planKey === 'free') {
      if (r === 'free') return { disabled: true as const, label: 'Huidig abonnement', mode: 'idle' as const };
      return { disabled: true as const, label: '…', mode: 'idle' as const };
    }
    if (planKey === 'paid') {
      if (r === 'free') return { disabled: false as const, label: CTA_SUBSCRIBE_PLUS, mode: 'checkout' as const };
      if (r === 'paid') return { disabled: true as const, label: 'Jouw abonnement', mode: 'idle' as const };
      return { disabled: true as const, label: 'Nu inbegrepen in Plus', mode: 'idle' as const };
    }
    /* pro / Business — waitlist UI is rendered as links (not this button handler) */
    if (r === 'free' || r === 'paid') {
      return { disabled: false as const, label: '', mode: 'waitlist' as const };
    }
    return { disabled: true as const, label: 'Jouw abonnement', mode: 'idle' as const };
  };

  const handlePlanClick = async (planKey: PlanKey, priceId: string | null) => {
    const { mode } = resolveButton(planKey);
    if (mode === 'idle') return;

    if (mode === 'waitlist') return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login?redirect=/pricing');
      return;
    }

    /* checkout (Plus only) */
    if (!priceId) {
      setError(
        'Voor dit abonnement is geen Stripe-prijs ingesteld op de server. Zet STRIPE_PRICE_PAID en STRIPE_PRICE_PRO op de backend, deploy de API opnieuw en vernieuw deze pagina.'
      );
      return;
    }

    setLoading(planKey);
    setError('');
    try {
      const response = await subscriptionApi.createCheckoutSession(priceId);
      window.location.href = response.checkout_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Afrekenen kon niet worden gestart';
      setError(msg);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size={32} />
            <span className="text-sm font-bold text-gray-900 dark:text-white">TCG Pulse</span>
          </Link>
          <div className="flex gap-2 sm:gap-3 items-center">
            <ThemeIconButton />
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

      <main className="flex-1 max-w-5xl mx-auto px-4 py-16 sm:py-20 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Eenvoudige, duidelijke prijzen</h2>
          <p className="text-gray-500 dark:text-gray-400">Begin gratis. Stap over op Plus als je alle deals en de volledige prijsgeschiedenis wilt.</p>
        </div>

        {canceledNotice && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm max-w-2xl mx-auto flex justify-between gap-3 items-start">
            <span>Geen probleem: het afrekenen is geannuleerd. Je kunt op elk moment opnieuw een abonnement kiezen.</span>
            <button
              type="button"
              onClick={() => setCanceledNotice(false)}
              className="shrink-0 text-amber-800 text-xs font-semibold underline"
            >
              Sluiten
            </button>
          </div>
        )}

        {error && (
          <div className="mb-8 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm max-w-2xl mx-auto">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const btn = resolveButton(plan.key);
            const isLoading = loading === plan.key;
            return (
              <div
                key={plan.key}
                id={plan.key === 'pro' ? 'business' : undefined}
                className={`bg-white rounded-xl p-6 relative ${
                  plan.highlighted ? 'border-2 border-gray-900 shadow-lg' : 'border border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gray-900 text-white text-[11px] font-bold rounded-full uppercase tracking-wide">
                    Meest gekozen
                  </div>
                )}
                {plan.key === 'pro' && (
                  <div className="absolute -top-3 right-4 px-2 py-0.5 bg-violet-100 text-violet-800 text-[10px] font-bold rounded-full uppercase tracking-wide">
                    Wachtlijst
                  </div>
                )}

                <h3 className="text-lg font-bold text-gray-900 mb-0.5">{plan.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{plan.description}</p>
                <div className="mb-5">
                  <span className={`font-bold text-gray-900 ${plan.key === 'pro' ? 'text-2xl' : 'text-3xl'}`}>{plan.price}</span>
                  {plan.period ? <span className="text-gray-400 text-sm">{plan.period}</span> : null}
                  {plan.key === 'pro' && (
                    <p className="text-xs text-gray-400 mt-1">Afrekenen opent zodra API en export klaar zijn</p>
                  )}
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

                {plan.key === 'pro' ? (
                  btn.mode === 'waitlist' ? (
                    <BusinessWaitlistActions variant="card" />
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-lg text-sm font-medium border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed min-h-[42px]"
                    >
                      {btn.label}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePlanClick(plan.key, plan.priceId)}
                    disabled={btn.disabled || isLoading}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 min-h-[42px] ${
                      plan.highlighted
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isLoading && (
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full border-2 animate-spin ${
                          plan.highlighted ? 'border-white/25 border-t-white' : 'border-gray-300 border-t-gray-800'
                        }`}
                        aria-hidden
                      />
                    )}
                    <span>{isLoading ? 'Doorsturen naar afrekenen…' : btn.label}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          30 dagen geld-terug-garantie op Plus. Altijd opzegbaar. Business heeft alleen een wachtlijst tot de API en data-export klaar zijn (hetzelfde e-mailadres als bij de wachtlijstknop).
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
