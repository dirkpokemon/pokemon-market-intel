'use client';

import { activateTour, completeTour } from '@/lib/tour';

export type TourUser = { role?: string } | null | undefined;

interface OnboardingTourProps {
  onComplete: () => void;
  user?: TourUser;
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const handleStartTour = () => {
    activateTour();
    onComplete();
  };

  const handleSkip = () => {
    completeTour();
    onComplete();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50" />

      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-lg font-bold shrink-0">
                T
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">Welkom bij TCG Pulse</h2>
                <p className="text-gray-400 text-sm">EU market intelligence voor trading card singles</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              Wil je een rondleiding? We nemen je stap voor stap mee langs alle pagina&apos;s, van de
              zoekbalk op Home tot je Portfolio, en leggen uit wat je per pagina kan verwachten.
            </p>

            <ul className="space-y-2 mb-6">
              {['Home: zoeken en dashboard', 'Top Deals: Deal Score uitgelegd', 'Market Pulse: marktoverzicht', 'Signals: momentum en alerts', 'Portfolio: collectie beheren'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs shrink-0">
                      ✓
                    </span>
                    {item}
                  </li>
                )
              )}
            </ul>

            <button
              type="button"
              onClick={handleStartTour}
              className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition mb-2"
            >
              Start rondleiding →
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Overslaan, ik verken het zelf
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
