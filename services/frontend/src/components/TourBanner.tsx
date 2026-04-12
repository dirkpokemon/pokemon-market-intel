'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  getTourState,
  setTourStep,
  completeTour,
  getTourSteps,
  getTourRole,
  type TourRole,
} from '@/lib/tour';

const PAGE_ICONS: Record<string, string> = {
  '/home': '🏠',
  '/deals': '🎯',
  '/insights': '📊',
  '/signals': '⚡',
  '/portfolio': '💼',
};

export default function TourBanner() {
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<TourRole>('free');
  const [animating, setAnimating] = useState(false);

  const refresh = () => {
    const state = getTourState();
    setActive(state.active);
    setStep(state.step);
    setRole(getTourRole());
  };

  useEffect(() => {
    refresh();
    window.addEventListener('tour-started', refresh);
    return () => window.removeEventListener('tour-started', refresh);
  }, [pathname]);

  if (!active) return null;

  const steps = getTourSteps(role);
  const currentStep = steps[step];
  if (!currentStep) return null;

  const isLastStep = step === steps.length - 1;
  const isOnCorrectPage = pathname === currentStep.page;

  const goToStep = (nextIdx: number) => {
    setAnimating(true);
    setTimeout(() => {
      setTourStep(nextIdx);
      setStep(nextIdx);
      const target = steps[nextIdx]?.page;
      if (target && target !== pathname) {
        router.push(target);
      }
      setAnimating(false);
    }, 150);
  };

  const handleNext = () => {
    if (isLastStep) {
      completeTour();
      setActive(false);
    } else {
      goToStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
  };

  const handleSkip = () => {
    completeTour();
    setActive(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-[2px]"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div
        className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4 transition-opacity duration-150 ${
          animating ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gray-900 px-6 pt-5 pb-4 text-white">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{PAGE_ICONS[currentStep.page] ?? '📍'}</span>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium leading-none mb-0.5">
                    {currentStep.pageLabel}
                  </p>
                  <h3 className="text-lg font-bold leading-snug">{currentStep.title}</h3>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-white text-lg leading-none shrink-0 mt-0.5 transition"
                aria-label="Skip tour"
              >
                ✕
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i < step
                      ? 'bg-blue-400'
                      : i === step
                      ? 'bg-white'
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-4">
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{currentStep.body}</p>

            {!isOnCorrectPage && (
              <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Click &quot;Next&quot; to open this page.
              </p>
            )}

            {currentStep.actionLink && (
              <div className="mt-3">
                <Link
                  href={currentStep.actionLink.href}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                  onClick={handleSkip}
                >
                  {currentStep.actionLink.label} →
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Step {step + 1} of {steps.length}
              </span>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className={`px-5 py-2 text-sm font-semibold rounded-xl transition ${
                    isLastStep
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-gray-900 hover:bg-gray-700 text-white'
                  }`}
                >
                  {isLastStep ? 'Done ✓' : 'Next →'}
                </button>
              </div>
            </div>
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition"
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
