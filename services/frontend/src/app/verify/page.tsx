'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import SiteFooter from '@/components/SiteFooter';

type VerifyState = 'loading' | 'success' | 'already' | 'error';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerifyState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('No verification token found. Please use the link from your email.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((res) => {
        if (res.already_verified) setState('already');
        else setState('success');
      })
      .catch((err) => {
        setState('error');
        setErrorMsg(err.message || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  const icon = {
    loading: (
      <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center animate-pulse">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
    ),
    success: (
      <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
    ),
    already: (
      <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </div>
    ),
    error: (
      <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
    ),
  };

  const titles: Record<VerifyState, string> = {
    loading: 'Verifying your email...',
    success: 'Email verified!',
    already: 'Already verified',
    error: 'Verification failed',
  };

  const descriptions: Record<VerifyState, string> = {
    loading: 'Please wait while we activate your account.',
    success: 'Your account is now active. You can sign in and start exploring the market.',
    already: 'Your email was already verified. You can sign in below.',
    error: errorMsg || 'Something went wrong.',
  };

  return (
    <>
      {icon[state]}

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{titles[state]}</h1>
      <p className="text-gray-500 text-sm mb-8">{state === 'error' ? errorMsg || descriptions.error : descriptions[state]}</p>

      {(state === 'success' || state === 'already') && (
        <Link
          href="/login"
          className="inline-block bg-gray-900 text-white py-2.5 px-8 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
        >
          Sign In
        </Link>
      )}

      {state === 'error' && (
        <div className="space-y-3">
          <Link
            href="/register"
            className="inline-block bg-gray-900 text-white py-2.5 px-8 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
          >
            Try Again
          </Link>
          <p className="text-xs text-gray-400">
            Or <Link href="/login" className="underline">sign in</Link> if you already have an account
          </p>
        </div>
      )}
    </>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-12 h-12 bg-white rounded-full border-[3px] border-gray-800 shadow-sm flex items-center justify-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500 rounded-t-full" />
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-800 transform -translate-y-1/2 z-10" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-gray-800 z-20">
              <div className="absolute inset-0.5 bg-gray-100 rounded-full" />
            </div>
          </div>
        </div>

        <Suspense fallback={
          <>
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center animate-pulse">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h1>
            <p className="text-gray-500 text-sm mb-8">Please wait while we activate your account.</p>
          </>
        }>
          <VerifyContent />
        </Suspense>
      </div>
      </div>
      <SiteFooter />
    </div>
  );
}
