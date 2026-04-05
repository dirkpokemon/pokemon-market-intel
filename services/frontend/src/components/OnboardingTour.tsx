'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type TourUser = { role?: string } | null | undefined;

function isPremiumUser(user: TourUser): boolean {
  const r = user?.role || 'free';
  return ['paid', 'pro', 'admin'].includes(r);
}

type TourStep = {
  title: string;
  description: string;
  position: 'center' | 'top';
  target?: string;
  actionLink?: { href: string; label: string };
};

function freeTourSteps(): TourStep[] {
  return [
    {
      title: 'Welcome to Pokémon Market Intel',
      description:
        'We help you spot strong Pokémon card deals across the EU: search the catalogue, compare deal scores, and track what you own or want.',
      position: 'center',
    },
    {
      title: 'Search the full catalogue',
      description:
        'On Home, use the search bar to find cards across a large EU listing index. Choose how results are sorted (relevance, price, or number of listings).',
      position: 'top',
      target: 'search',
    },
    {
      title: 'Your dashboard at a glance',
      description:
        'Stat cards and deal highlights summarise what the market looks like right now. Use them as a quick pulse before you open individual cards.',
      position: 'top',
      target: 'kpis',
    },
    {
      title: 'Market Intel (subscribers)',
      description:
        'Richer market signals and intel live under Market Intel in the sidebar. That area is included with a subscription—useful if you want ideas beyond deal scores alone.',
      position: 'top',
      target: 'signals',
      actionLink: { href: '/pricing', label: 'View plans' },
    },
    {
      title: 'Top deals & Deal Score',
      description:
        'Deal Scores from 0–100 rank how attractive a price looks versus the broader market. Open a card for more context and buy links when we have them.',
      position: 'top',
      target: 'deals',
    },
    {
      title: 'Portfolio & watchlist',
      description:
        'Track collection value and watch cards you care about under Portfolio—My Collection and My Watchlist keep everything in one place.',
      position: 'top',
      target: 'portfolio',
    },
    {
      title: 'Tips',
      description:
        'Portfolio and watchlist data is stored in this browser. You can replay this tour anytime from Settings if you want a refresher.',
      position: 'center',
    },
    {
      title: "You're ready",
      description:
        'Explore Home and Top Deals, build your portfolio, and subscribe when you want Market Intel. Good luck trading.',
      position: 'center',
    },
  ];
}

function premiumTourSteps(): TourStep[] {
  return [
    {
      title: 'Welcome — full access',
      description:
        'Your plan includes Market Intel and the rest of the toolkit. Here is how everything fits together in a short walkthrough.',
      position: 'center',
    },
    {
      title: 'Search the catalogue',
      description:
        'From Home, search across a large EU index. Switch sorting to focus on relevance, price, or how many listings support each card.',
      position: 'top',
      target: 'search',
    },
    {
      title: 'Dashboard overview',
      description:
        'KPIs and previews summarise deals and, when available, recent signal activity. It is a good starting point every time you log in.',
      position: 'top',
      target: 'kpis',
    },
    {
      title: 'Market Intel',
      description:
        'Use Market Intel in the sidebar for signals and deeper reads. That space is built for subscribers—open it when you want narrative and ideas next to raw scores.',
      position: 'top',
      target: 'signals',
      actionLink: { href: '/signals', label: 'Open Market Intel' },
    },
    {
      title: 'Top deals',
      description:
        'Deal Score highlights strong prices versus the market average. Click through for detail and purchase links where available.',
      position: 'top',
      target: 'deals',
    },
    {
      title: 'Portfolio',
      description:
        'My Collection and My Watchlist help you track value and price targets over time.',
      position: 'top',
      target: 'portfolio',
    },
    {
      title: 'Alerts & settings',
      description:
        'Tune email or Telegram alerts and other preferences under Settings so notifications match how you like to trade.',
      position: 'center',
      actionLink: { href: '/settings', label: 'Go to Settings' },
    },
    {
      title: "You're set",
      description:
        'Dive into signals, deals, and your portfolio whenever you like. Use Feedback in the sidebar if something is unclear—we read it.',
      position: 'center',
    },
  ];
}

interface OnboardingTourProps {
  onComplete: () => void;
  user?: TourUser;
}

export default function OnboardingTour({ onComplete, user }: OnboardingTourProps) {
  const steps = useMemo(
    () => (isPremiumUser(user) ? premiumTourSteps() : freeTourSteps()),
    [user?.role]
  );

  const [currentStep, setCurrentStep] = useState(0);

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 transition-opacity" />

      <div
        className={`fixed z-50 ${
          currentStepData.position === 'center'
            ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
            : 'top-24 left-1/2 transform -translate-x-1/2'
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
          <div className="bg-gray-900 p-6 text-white">
            <div className="flex items-center justify-between mb-2 gap-3">
              <h3 className="text-xl font-bold leading-snug">{currentStepData.title}</h3>
              <button
                type="button"
                onClick={handleSkip}
                className="text-white/80 hover:text-white text-sm shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full ${
                    idx <= currentStep ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-6">
            <p className="text-gray-700 leading-relaxed mb-4">{currentStepData.description}</p>

            {currentStepData.actionLink && (
              <div className="mb-6">
                <Link
                  href={currentStepData.actionLink.href}
                  className="inline-flex text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-600"
                >
                  {currentStepData.actionLink.label} →
                </Link>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    ← Back
                  </button>
                )}
                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
                  >
                    Get started
                  </button>
                )}
              </div>
            </div>

            {currentStep < steps.length - 1 && (
              <button
                type="button"
                onClick={handleSkip}
                className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Skip tour
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
