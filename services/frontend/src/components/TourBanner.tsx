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

export default function TourBanner() {
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<TourRole>('free');

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

  const goToStep = (nextIdx: number) => {
    setTourStep(nextIdx);
    setStep(nextIdx);
    const target = steps[nextIdx]?.page;
    if (target && target !== pathname) {
      router.push(target);
    }
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
    <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 text-white">
      <div className="max-w-5xl mx-auto">
        {/* Header row: label + progress + skip */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
            <span className="font-semibold text-white whitespace-nowrap">Welkomsttour</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Stap {step + 1} van {steps.length}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-blue-400 truncate">{currentStep.pageLabel}</span>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1 flex-1 max-w-[120px]">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= step ? 'bg-blue-400' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white text-xs whitespace-nowrap shrink-0 transition"
          >
            Overslaan ✕
          </button>
        </div>

        {/* Content + nav row */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug mb-0.5">{currentStep.title}</p>
            <p className="text-gray-300 text-xs leading-relaxed">{currentStep.body}</p>
            {currentStep.actionLink && (
              <Link
                href={currentStep.actionLink.href}
                className="text-blue-400 hover:text-blue-300 text-xs font-medium mt-1 inline-block transition"
              >
                {currentStep.actionLink.label} →
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                ← Terug
              </button>
            )}
            <button
              onClick={handleNext}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                isLastStep
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isLastStep ? 'Klaar ✓' : 'Volgende →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
