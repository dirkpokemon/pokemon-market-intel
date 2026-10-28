'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import AuthCard, { AuthError, authButtonClass, authInputClass } from '@/components/AuthCard';

function ResetForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Je wachtwoord moet minstens 8 tekens hebben.');
    if (password !== repeat) return setError('De twee wachtwoorden zijn niet hetzelfde.');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Het wijzigen is mislukt. Vraag een nieuwe link aan.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <AuthError message="Deze link is onvolledig. Gebruik de link uit de mail, of vraag een nieuwe aan." />
        <Link href="/wachtwoord-vergeten" className={`${authButtonClass} block text-center`}>
          Nieuwe link aanvragen
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">Je wachtwoord is gewijzigd. Je kunt nu inloggen.</p>
        <Link href="/login" className={`${authButtonClass} block text-center`}>
          Inloggen
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthError message={error} />
      {error && (
        <p className="-mt-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
          Werkt de link niet meer?{' '}
          <Link href="/wachtwoord-vergeten" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Vraag een nieuwe aan
          </Link>
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Nieuw wachtwoord
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            autoComplete="new-password"
            className={authInputClass}
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Minstens 8 tekens</p>
        </div>
        <div>
          <label htmlFor="repeat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Herhaal wachtwoord
          </label>
          <input
            id="repeat"
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            className={authInputClass}
          />
        </div>
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Opslaan…' : 'Wachtwoord opslaan'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Nieuw wachtwoord kiezen">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}
