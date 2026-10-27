'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import BrandMark from '@/components/BrandMark';
import SiteFooter from '@/components/SiteFooter';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [digest, setDigest] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!firstName.trim()) { setError('Vul je voornaam in'); setLoading(false); return; }
    if (!lastName.trim()) { setError('Vul je achternaam in'); setLoading(false); return; }
    if (password.length < 8) { setError('Je wachtwoord moet minstens 8 tekens hebben'); setLoading(false); return; }

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const res = await authApi.register(email, password, fullName, digest);
      if (res.verify_url) setVerifyUrl(res.verify_url);
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || 'Registreren mislukt');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="text-left mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar home
            </Link>
          </div>
          {/* Envelope icon */}
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gray-900 dark:bg-indigo-600 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4L12 13L2 4" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Kijk in je mail</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            We hebben een bevestigingslink gestuurd naar<br />
            <span className="font-medium text-gray-900 dark:text-white">{email}</span>
          </p>

          {verifyUrl ? (
            <div className="bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">De e-mail kon niet worden verstuurd</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">Klik op de knop hieronder om je account direct te bevestigen:</p>
              <a
                href={verifyUrl}
                className="inline-block bg-gray-900 dark:bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-500 transition text-sm font-medium"
              >
                Account bevestigen
              </a>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Klik op de link in de mail om je account te activeren. De link is 48 uur geldig. Zie je niets binnen een paar minuten? Kijk dan in je spammap.
              </p>
            </div>
          )}

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Al bevestigd?{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Inloggen
            </Link>
          </div>
        </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug naar home
          </Link>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <BrandMark size={48} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account aanmaken</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Word lid van TCG Pulse</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Voornaam
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-500"
                placeholder="Sam"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Achternaam
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-500"
                placeholder="de Vries"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-500"
              placeholder="jij@voorbeeld.nl"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-500"
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Minstens 8 tekens</p>
          </div>

          <label htmlFor="digest" className="flex items-start gap-2.5 cursor-pointer">
            <input
              id="digest"
              type="checkbox"
              checked={digest}
              onChange={(e) => setDigest(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Stuur me elke ochtend een e-mail met de beste deals.{' '}
              <span className="text-gray-400 dark:text-gray-500">Afmelden kan altijd, via de link in elke mail of bij Instellingen.</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-gray-900 dark:bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-500 transition text-sm font-medium flex items-center justify-center gap-2 min-h-[42px] disabled:opacity-90 disabled:cursor-wait disabled:hover:bg-gray-900 dark:disabled:hover:bg-indigo-600 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
          >
            {loading && (
              <span
                className="h-4 w-4 shrink-0 rounded-full border-2 border-white/25 border-t-white animate-spin"
                aria-hidden
              />
            )}
            <span>{loading ? 'Account aanmaken…' : 'Account aanmaken'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500 dark:text-gray-400">Heb je al een account? </span>
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline font-medium">
            Inloggen
          </Link>
        </div>
      </div>
      </div>
      <SiteFooter />
    </div>
  );
}
