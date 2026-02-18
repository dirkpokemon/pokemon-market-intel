'use client';

import { useState } from 'react';

interface OnboardingTourProps {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "👋 Welcome to Pokemon Market Intel!",
      description: "Your AI-powered platform for finding the best Pokemon card deals in the EU market. Let me show you around!",
      position: "center"
    },
    {
      title: "🔍 Search & Filter",
      description: "Use the search bar to find specific cards, and advanced filters to narrow down by price, score, or category. Try quick chips like 'Excellent Only' or 'Under €50' for instant filtering.",
      target: "search",
      position: "top"
    },
    {
      title: "📊 KPI Cards",
      description: "Get an instant overview of your market: Total deals available, average deal scores, excellent opportunities, and your watchlist count.",
      target: "kpis",
      position: "top"
    },
    {
      title: "🎯 Priority Signals",
      description: "Premium users get real-time trading signals! See high-priority opportunities, undervalued cards, and arbitrage deals before anyone else.",
      target: "signals",
      position: "top"
    },
    {
      title: "💰 Top Opportunities",
      description: "Browse the best deals with our Deal Score system (0-100). Click any card to see detailed information, price history, and direct buy links!",
      target: "deals",
      position: "top"
    },
    {
      title: "⭐ Watchlist",
      description: "Click the star on any deal to save it to your watchlist. Access your saved deals anytime by clicking the Watchlist button in the header!",
      target: "watchlist",
      position: "top"
    },
    {
      title: "⌨️ Pro Tips",
      description: "Keyboard shortcuts: Press 'S' to focus search, 'W' to toggle watchlist, '?' for help. All your preferences are saved automatically!",
      position: "center"
    },
    {
      title: "🚀 You're All Set!",
      description: "Start exploring deals, build your watchlist, and find the best Pokemon card opportunities in the EU market. Happy trading!",
      position: "center"
    }
  ];

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
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 transition-opacity" />

      {/* Tour Modal */}
      <div className={`fixed z-50 ${
        currentStepData.position === 'center' 
          ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
          : 'top-24 left-1/2 transform -translate-x-1/2'
      }`}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold">{currentStepData.title}</h3>
              <button
                onClick={handleSkip}
                className="text-white/80 hover:text-white text-sm"
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

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 leading-relaxed mb-6">
              {currentStepData.description}
            </p>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    ← Back
                  </button>
                )}
                {currentStep < steps.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
                  >
                    Get Started! 🚀
                  </button>
                )}
              </div>
            </div>

            {/* Skip */}
            {currentStep < steps.length - 1 && (
              <button
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
