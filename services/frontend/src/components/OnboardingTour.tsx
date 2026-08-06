'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { activateTour, completeTour } from '@/lib/tour';

export type TourUser = { role?: string } | null | undefined;

interface OnboardingTourProps {
  onComplete: () => void;
  user?: TourUser;
}

type Goal = 'deals' | 'watchlist';

const GOALS: { id: Goal; icon: string; title: string; description: string; page: string }[] = [
  {
    id: 'deals',
    icon: '🎯',
    title: 'Deals spotten',
    description: 'Vind kaarten onder marktprijs met AI Deal Score',
    page: '/deals',
  },
  {
    id: 'watchlist',
    icon: '🔔',
    title: 'Prijsalerts',
    description: 'Zet target-prijzen en krijg mail/Telegram bij een daling',
    page: '/watchlist',
  },
];

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
  const [animating, setAnimating] = useState(false);

  const transition = (next: number) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 150);
  };

  const toggleGoal = (goal: Goal) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const primaryGoalPage = (): string => {
    if (selectedGoals.includes('deals')) return '/deals';
    if (selectedGoals.includes('watchlist')) return '/watchlist';
    return '/home';
  };

  const handleFinishWithTour = () => {
    if (selectedGoals.length > 0) {
      localStorage.setItem('onboarding_goals', JSON.stringify(selectedGoals));
    }
    activateTour();
    onComplete();
    router.push('/home');
  };

  const handleFinishDirect = () => {
    if (selectedGoals.length > 0) {
      localStorage.setItem('onboarding_goals', JSON.stringify(selectedGoals));
    }
    completeTour();
    onComplete();
    router.push(primaryGoalPage());
  };

  const primaryGoalInfo = GOALS.find(g => g.id === selectedGoals[0]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4">
        <div
          className={`bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-opacity duration-150 ${
            animating ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pt-5 pb-1">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className={`rounded-full transition-all duration-300 ${
                  n === step
                    ? 'w-5 h-2 bg-gray-900 dark:bg-indigo-500'
                    : n < step
                    ? 'w-2 h-2 bg-gray-400 dark:bg-gray-600'
                    : 'w-2 h-2 bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <>
              <div className="px-7 pt-6 pb-2 text-center">
                <div className="w-16 h-16 bg-gray-900 dark:bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                  🎴
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welkom bij TCG Pulse
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  EU marktintelligentie voor Pokémon TCG — live prijzen, deal-scores en prijsalerts van Europese listings.
                </p>
              </div>

              <div className="px-7 py-5 space-y-3">
                {[
                  { icon: '🎯', label: 'Deal Score', desc: 'AI-scoring op 0–100 — hoe goedkoper vs markt, hoe hoger' },
                  { icon: '🔔', label: 'Prijsalerts', desc: 'Target-prijs per kaart, mail/Telegram bij een daling' },
                  { icon: '📦', label: 'Sets & sealed', desc: 'Blader alle sets met live EU prijzen' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-7 pb-7">
                <button
                  onClick={() => transition(2)}
                  className="w-full py-3 bg-gray-900 dark:bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-indigo-500 transition"
                >
                  Aan de slag →
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Goal selection ── */}
          {step === 2 && (
            <>
              <div className="px-7 pt-6 pb-4 text-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Wat wil je bereiken?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Kies alles wat op jou van toepassing is
                </p>
              </div>

              <div className="px-7 pb-5 space-y-3">
                {GOALS.map(goal => {
                  const selected = selectedGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? 'border-gray-900 dark:border-indigo-500 bg-gray-50 dark:bg-indigo-950/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{goal.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{goal.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{goal.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected
                          ? 'border-gray-900 dark:border-indigo-500 bg-gray-900 dark:bg-indigo-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-7 pb-7 flex gap-3">
                <button
                  onClick={() => transition(1)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  ← Terug
                </button>
                <button
                  onClick={() => transition(3)}
                  className="flex-1 py-2.5 bg-gray-900 dark:bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-indigo-500 transition disabled:opacity-40"
                >
                  Volgende →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Start ── */}
          {step === 3 && (
            <>
              <div className="px-7 pt-6 pb-4 text-center">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                  {primaryGoalInfo?.icon ?? '🚀'}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Je bent klaar!
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {selectedGoals.length > 0
                    ? `We sturen je naar ${primaryGoalInfo?.title ?? 'de app'}. Je kan altijd naar andere pagina's navigeren via het menu.`
                    : 'Verken de app via het menu aan de linkerkant.'}
                </p>
              </div>

              <div className="px-7 pb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Wil je eerst een rondleiding?
                </p>
                <button
                  onClick={handleFinishWithTour}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-900 dark:hover:border-indigo-500 transition text-left mb-2 group"
                >
                  <span className="text-xl">🗺️</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Ja, toon me de rondleiding</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Stap voor stap door elke pagina</p>
                  </div>
                </button>
                <button
                  onClick={handleFinishDirect}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-900 dark:hover:border-indigo-500 transition text-left group"
                >
                  <span className="text-xl">{primaryGoalInfo?.icon ?? '⚡'}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Direct naar {primaryGoalInfo?.title ?? 'de app'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {primaryGoalInfo?.description ?? 'Meteen beginnen'}
                    </p>
                  </div>
                </button>
              </div>

              <div className="px-7 pb-6 pt-2 flex gap-3">
                <button
                  onClick={() => transition(2)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  ← Terug
                </button>
                <button
                  onClick={handleFinishDirect}
                  className="flex-1 py-2.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  Overslaan — ik verken zelf
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
