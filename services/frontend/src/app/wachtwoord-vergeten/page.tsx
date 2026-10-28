'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import AuthCard, { AuthError, authButtonClass, authInputClass } from '@/components/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setSentMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Er ging iets mis. Probeer het later opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  if (sentMessage) {
    return (
      <AuthCard title="Kijk in je mail">
        <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{sentMessage}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-2">De link is een uur geldig.</p>
        </div>
        <div className="text-center text-sm">
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Terug naar inloggen
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Wachtwoord vergeten" subtitle="We sturen je een link om een nieuw wachtwoord te kiezen">
      <AuthError message={error} />
      <form onSubmit={handleSubmit} className="space-y-5">
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
            autoComplete="email"
            className={authInputClass}
            placeholder="jij@voorbeeld.nl"
          />
        </div>
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Versturen…' : 'Stuur me een link'}
        </button>
      </form>
    </AuthCard>
  );
}
